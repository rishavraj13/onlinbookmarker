import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface Folder {
  id: string;
  name: string;
  is_system?: boolean;
}

export interface Bookmark {
  id: string;
  folder_id: string;
  title: string;
  content: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  folders?: { name: string }; // from join
}

export type BookmarkInsert = Omit<Bookmark, 'id' | 'created_at' | 'updated_at' | 'folders'>;
export type BookmarkUpdate = Pick<Bookmark, 'id'> & Partial<Omit<Bookmark, 'id' | 'folders'>>;

export async function getFolders(): Promise<Folder[]> {
  if (!isSupabaseConfigured || !supabase) {
    let folders = JSON.parse(localStorage.getItem('gpt_bookmark_folders_v2') || 'null');
    if (!folders) {
      folders = [];
      localStorage.setItem('gpt_bookmark_folders_v2', JSON.stringify(folders));
    }
    return folders;
  }
  
  if (!window.currentUser) return [];

  let { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true });
    
  if (error) {
    console.error('Error fetching folders:', error);
    return [];
  }
  
  return data || [];
}

export async function saveFolder(name: string) {
  if (!isSupabaseConfigured || !supabase) {
    const folders = await getFolders();
    if (!folders.find(f => f.name.toLowerCase() === name.toLowerCase())) {
      folders.push({ id: `local-folder-${Date.now()}`, name });
      localStorage.setItem('gpt_bookmark_folders_v2', JSON.stringify(folders));
      window.dispatchEvent(new CustomEvent('foldersUpdated'));
    }
    return;
  }

  if (!window.currentUser) return;
  
  const folders = await getFolders();
  if (folders.find(f => f.name.toLowerCase() === name.toLowerCase())) {
    return;
  }
  
  const { error } = await supabase.from('folders').insert({
    name,
    user_id: window.currentUser.id
  });
  
  if (error) console.error('Error inserting folder:', error);
  window.dispatchEvent(new CustomEvent('foldersUpdated'));
}

export async function deleteFolder(id: string) {
  if (!isSupabaseConfigured || !supabase) {
    let folders = await getFolders();
    folders = folders.filter((f: Folder) => f.id !== id);
    localStorage.setItem('gpt_bookmark_folders_v2', JSON.stringify(folders));
    
    // Also delete bookmarks in folder
    let bookmarks = JSON.parse(localStorage.getItem('gpt_bookmarks_v2') || '[]');
    bookmarks = bookmarks.filter((b: Bookmark) => b.folder_id !== id);
    localStorage.setItem('gpt_bookmarks_v2', JSON.stringify(bookmarks));
    
    window.dispatchEvent(new CustomEvent('foldersUpdated'));
    window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
    return;
  }
  
  // Delete folder (cascade delete will handle bookmarks in supabase)
  await supabase.from('folders').delete().eq('id', id);
  
  window.dispatchEvent(new CustomEvent('foldersUpdated'));
  window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
}

export async function getBookmarks(): Promise<Bookmark[]> {
  if (!isSupabaseConfigured || !supabase) {
    const bookmarks = JSON.parse(localStorage.getItem('gpt_bookmarks_v2') || '[]');
    const folders = await getFolders();
    // simulate join
    return bookmarks.map((b: Bookmark) => {
      const folder = folders.find(f => f.id === b.folder_id);
      return { ...b, folders: { name: folder ? folder.name : 'Unknown' } };
    });
  }
  
  if (!window.currentUser) return [];

  const { data, error } = await supabase
    .from('bookmarks')
    .select('*, folders(name)')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching bookmarks:', error);
    return [];
  }
  return data as Bookmark[];
}

export async function saveBookmark(bookmark: BookmarkInsert | BookmarkUpdate, isEdit: boolean = false) {
  if (!isSupabaseConfigured || !supabase) {
    const bookmarks = JSON.parse(localStorage.getItem('gpt_bookmarks_v2') || '[]');
    if (isEdit) {
      const updatePayload = bookmark as BookmarkUpdate;
      const index = bookmarks.findIndex((b: Bookmark) => b.id === updatePayload.id);
      if (index !== -1) bookmarks[index] = { ...bookmarks[index], ...bookmark };
    } else {
      bookmarks.unshift(bookmark);
    }
    localStorage.setItem('gpt_bookmarks_v2', JSON.stringify(bookmarks));
    window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
    return;
  }

  if (!window.currentUser) return;
  
  if (isEdit) {
    const updatePayload = bookmark as BookmarkUpdate;
    const payload = { ...updatePayload, user_id: window.currentUser.id };
    const { error } = await supabase.from('bookmarks').update(payload).eq('id', updatePayload.id);
    if (error) console.error('Error updating bookmark:', error);
  } else {
    const insertPayload = bookmark as BookmarkInsert;
    const payload = { ...insertPayload, user_id: window.currentUser.id };
    const { error } = await supabase.from('bookmarks').insert(payload);
    if (error) console.error('Error inserting bookmark:', error);
  }
  
  window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
}

export async function deleteBookmark(id: string) {
  if (!isSupabaseConfigured || !supabase) {
    let bookmarks = JSON.parse(localStorage.getItem('gpt_bookmarks_v2') || '[]');
    bookmarks = bookmarks.filter((b: Bookmark) => b.id !== id);
    localStorage.setItem('gpt_bookmarks_v2', JSON.stringify(bookmarks));
    window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
    return;
  }
  
  const { error } = await supabase.from('bookmarks').delete().eq('id', id);
  if (error) console.error('Error deleting bookmark:', error);
  window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
}

let migrationInProgress = false;

export async function migrateLocalDataToCloud(userId: string): Promise<void> {
  if (migrationInProgress) return;
  migrationInProgress = true;
  
  try {
    if (!isSupabaseConfigured || !supabase) return;
    if (localStorage.getItem('bm_migrated') === 'true') return;

    const localFolders = JSON.parse(localStorage.getItem('gpt_bookmark_folders_v2') || 'null');
    const localBookmarks = JSON.parse(localStorage.getItem('gpt_bookmarks_v2') || 'null');
    
    const hasInProgressFolderMap = !!localStorage.getItem('bm_migration_folder_map');
    const hasInProgressBookmarks = !!localStorage.getItem('bm_migration_bookmark_ids');

    const safeFolders = localFolders || [];
    const safeBookmarks = localBookmarks || [];

    // If there are no local folders/bookmarks at all and no in-progress migration record, nothing to migrate
    if (safeFolders.length === 0 && safeBookmarks.length === 0 && !hasInProgressFolderMap && !hasInProgressBookmarks) {
      localStorage.setItem('bm_migrated', 'true');
      return;
    }

    let folderMap: Record<string, string> = JSON.parse(localStorage.getItem('bm_migration_folder_map') || '{}');

    for (const f of safeFolders) {
      if (!folderMap[f.id]) {
        const { data, error } = await supabase.from('folders').insert({
          user_id: userId,
          name: f.name,
          is_system: f.is_system || false
        }).select().single();

        if (error || !data) {
          console.error('Migration error inserting folder:', error);
          return;
        }

        folderMap[f.id] = data.id;
        localStorage.setItem('bm_migration_folder_map', JSON.stringify(folderMap));
      }
    }

    let migratedBookmarkIds: string[] = JSON.parse(localStorage.getItem('bm_migration_bookmark_ids') || '[]');

    for (const b of safeBookmarks) {
      if (!migratedBookmarkIds.includes(b.id)) {
        const cloudFolderId = folderMap[b.folder_id];
        if (!cloudFolderId) {
          console.error('Migration error: no cloud folder mapping for bookmark', b);
          return;
        }

        const { error } = await supabase.from('bookmarks').insert({
          user_id: userId,
          folder_id: cloudFolderId,
          title: b.title,
          content: b.content,
          tags: b.tags || []
        });

        if (error) {
          console.error('Migration error inserting bookmark:', error);
          return;
        }

        migratedBookmarkIds.push(b.id);
        localStorage.setItem('bm_migration_bookmark_ids', JSON.stringify(migratedBookmarkIds));
      }
    }

    localStorage.removeItem('gpt_bookmark_folders_v2');
    localStorage.removeItem('gpt_bookmarks_v2');
    localStorage.removeItem('bm_migration_folder_map');
    localStorage.removeItem('bm_migration_bookmark_ids');
    
    localStorage.setItem('bm_migrated', 'true');
  } finally {
    migrationInProgress = false;
  }
}
