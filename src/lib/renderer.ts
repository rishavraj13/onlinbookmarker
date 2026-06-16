import type { Bookmark } from './dataClient';

export function renderBookmarks(bookmarks: Bookmark[]): string {
  if (!bookmarks || bookmarks.length === 0) {
    return '';
  }

  return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4">` + bookmarks.map(b => {
    // Determine platform name and icon
    const platformName = b.folders?.name || 'Folder';
    let icon = 'folder';
    let colorClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20';

    const tagsHtml = (b.tags || []).map((t: string) => 
      `<span class="px-2 py-1 bg-surface-800 text-surface-300 rounded-md text-xs border border-surface-700/50">${t}</span>`
    ).join('');

    const dateStr = new Date(b.created_at).toLocaleDateString(undefined, { 
      year: 'numeric', month: 'short', day: 'numeric', 
      hour: '2-digit', minute: '2-digit' 
    });

    return `
      <div class="glass-panel p-5 group flex flex-col hover:border-surface-600 transition-all duration-300 shadow-md hover:shadow-lg">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <div class="p-1.5 rounded-lg border ${colorClass}">
              <i data-lucide="${icon}" class="w-4 h-4"></i>
            </div>
            <span class="text-sm font-medium text-surface-200 capitalize">${platformName}</span>
          </div>
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button class="p-1.5 text-surface-400 hover:text-text-main rounded-md hover:bg-surface-700 transition-colors btn-expand-bookmark" data-id="${b.id}" title="Expand & Edit (Auto-save)">
              <i data-lucide="maximize-2" class="w-4 h-4"></i>
            </button>
            <button class="p-1.5 text-surface-400 hover:text-text-main rounded-md hover:bg-surface-700 transition-colors btn-copy-bookmark" data-id="${b.id}" title="Copy content">
              <i data-lucide="copy" class="w-4 h-4"></i>
            </button>
            <button class="p-1.5 text-surface-400 hover:text-text-main rounded-md hover:bg-surface-700 transition-colors btn-edit-bookmark" data-id="${b.id}" title="Edit bookmark details">
              <i data-lucide="edit-2" class="w-4 h-4"></i>
            </button>
            <div class="relative group/menu">
              <button class="p-1.5 text-surface-400 hover:text-text-main rounded-md hover:bg-surface-700 transition-colors" title="Export">
                <i data-lucide="download" class="w-4 h-4"></i>
              </button>
              <div class="absolute right-0 top-full mt-1 w-32 bg-surface-800 border border-surface-700 rounded-lg shadow-xl opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 overflow-hidden">
                <button class="w-full text-left px-3 py-2 text-xs text-surface-300 hover:bg-surface-700 hover:text-text-main transition-colors btn-export-pdf" data-id="${b.id}">Export to PDF</button>
                <button class="w-full text-left px-3 py-2 text-xs text-surface-300 hover:bg-surface-700 hover:text-text-main transition-colors btn-export-txt" data-id="${b.id}">Export to TXT</button>
              </div>
            </div>
            <button class="p-1.5 text-surface-400 hover:text-red-400 rounded-md hover:bg-surface-700 transition-colors btn-delete-bookmark" data-id="${b.id}" title="Delete bookmark">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
        
        <h4 class="text-lg font-bold text-text-main mb-2 truncate" title="${b.title || 'Untitled'}">${b.title || 'Untitled'}</h4>
        
        <div class="flex-1 bg-surface-900/50 rounded-xl p-3 border border-surface-700/50 mb-4 overflow-hidden relative">
          <div class="text-sm text-surface-300 line-clamp-4" style="white-space: pre-wrap;">${b.content}</div>
          <div class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface-900/90 to-transparent pointer-events-none"></div>
        </div>
        
        <div class="flex items-center justify-between mt-auto">
          <div class="flex gap-1.5 overflow-x-auto no-scrollbar max-w-[60%]">
            ${tagsHtml}
          </div>
          <span class="text-[11px] text-surface-500 font-medium">${dateStr}</span>
        </div>
      </div>
    `;
  }).join('') + `</div>`;
}
