import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface Folder {
  id: string;
  name: string;
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

export async function getFolders(): Promise<Folder[]> {
  if (!isSupabaseConfigured || !supabase) {
    let folders = JSON.parse(localStorage.getItem('gpt_bookmark_folders_v2') || 'null');
    if (!folders) {
      folders = [];
      localStorage.setItem('gpt_bookmark_folders_v2', JSON.stringify(folders));
    }
    return folders;
  }
  
  // @ts-ignore
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

  // @ts-ignore
  if (!window.currentUser) return;
  
  const { error } = await supabase.from('folders').insert({
    name,
    // @ts-ignore
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
    return bookmarks.map((b: any) => {
      const folder = folders.find(f => f.id === b.folder_id);
      return { ...b, folders: { name: folder ? folder.name : 'Unknown' } };
    });
  }
  
  // @ts-ignore
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

export async function saveBookmark(bookmark: any, isEdit: boolean = false) {
  if (!isSupabaseConfigured || !supabase) {
    const bookmarks = JSON.parse(localStorage.getItem('gpt_bookmarks_v2') || '[]');
    if (isEdit) {
      const index = bookmarks.findIndex((b: any) => b.id === bookmark.id);
      if (index !== -1) bookmarks[index] = bookmark;
    } else {
      bookmarks.unshift(bookmark);
    }
    localStorage.setItem('gpt_bookmarks_v2', JSON.stringify(bookmarks));
    window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
    return;
  }

  // @ts-ignore
  if (!window.currentUser) return;
  
  const payload = {
    ...bookmark,
    // @ts-ignore
    user_id: window.currentUser.id
  };
  
  if (isEdit) {
    const { error } = await supabase.from('bookmarks').update(payload).eq('id', bookmark.id);
    if (error) console.error('Error updating bookmark:', error);
  } else {
    const { error } = await supabase.from('bookmarks').insert(payload);
    if (error) console.error('Error inserting bookmark:', error);
  }
  
  window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
}

export async function deleteBookmark(id: string) {
  if (!isSupabaseConfigured || !supabase) {
    let bookmarks = JSON.parse(localStorage.getItem('gpt_bookmarks_v2') || '[]');
    bookmarks = bookmarks.filter((b: any) => b.id !== id);
    localStorage.setItem('gpt_bookmarks_v2', JSON.stringify(bookmarks));
    window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
    return;
  }
  
  const { error } = await supabase.from('bookmarks').delete().eq('id', id);
  if (error) console.error('Error deleting bookmark:', error);
  window.dispatchEvent(new CustomEvent('bookmarksUpdated'));
}
