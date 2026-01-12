import { useEffect, useState } from 'react';

interface ClipboardItem {
  id: number;
  text: string;
  timestamp: number;
  isPinned?: boolean;
  sourceUrl?: string;
  sourceTitle?: string;
}

export default function App() {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Detect URLs for the "Open Link" button logic
  const isUrl = (text: string) => {
    const pattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;
    return pattern.test(text.trim());
  };

  // 2. Load data and cleanup old items (>24h) unless pinned
  const loadData = () => {
    chrome.storage.local.get(['clipboardHistory'], (result) => {
      const history = (result.clipboardHistory as ClipboardItem[]) || [];
      const now = Date.now();
      const cutoff = now - 24 * 60 * 60 * 1000;

      const valid = history.filter(i => i.isPinned || i.timestamp > cutoff);
      
      if (valid.length !== history.length) {
        chrome.storage.local.set({ clipboardHistory: valid });
      }

      // Sort: Pinned items stay at the top
      const sorted = valid.sort((a, b) => {
        if (a.isPinned === b.isPinned) return b.timestamp - a.timestamp;
        return a.isPinned ? -1 : 1;
      });

      setItems(sorted);
    });
  };

  useEffect(() => {
    loadData();
    chrome.storage.onChanged.addListener(loadData);
    return () => chrome.storage.onChanged.removeListener(loadData);
  }, []);

  const handleCopy = (item: ClipboardItem) => {
    navigator.clipboard.writeText(item.text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1000);
  };

  const togglePin = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const updated = items.map(i => i.id === id ? { ...i, isPinned: !i.isPinned } : i);
    chrome.storage.local.set({ clipboardHistory: updated });
  };

  const openLink = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const link = url.startsWith('http') ? url : `https://${url}`;
    chrome.tabs.create({ url: link });
  };

  const filteredItems = items.filter(i => 
    i.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-87.5 h-137.5 bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Header */}
      <header className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-indigo-600 font-extrabold text-xl tracking-tight leading-none">Clippa</h1>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">History & Sources</span>
        </div>
        <button 
          onClick={() => confirm("Clear all history?") && chrome.storage.local.set({ clipboardHistory: [] })}
          className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-100 font-bold hover:bg-red-100 transition-colors"
        >
          CLEAR ALL
        </button>
      </header>

      {/* Search Bar */}
      <div className="p-3 bg-white border-b border-slate-100">
        <input 
          type="text"
          placeholder="Search snippets or sources..."
          className="w-full px-3 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
        {filteredItems.length > 0 ? filteredItems.map((item) => {
          const isLink = isUrl(item.text);
          return (
            <div 
              key={item.id}
              onClick={() => handleCopy(item)}
              className={`bg-white p-4 rounded-xl border transition-all cursor-pointer relative group ${
                item.isPinned ? 'border-indigo-300 ring-2 ring-indigo-50' : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div className="flex justify-between items-start gap-2 mb-3">
                <p className={`text-sm leading-relaxed wrap-break-words flex-1 ${isLink ? 'text-blue-600 underline font-medium' : 'text-slate-700'}`}>
                  {item.text}
                </p>
                <button 
                  onClick={(e) => togglePin(e, item.id)}
                  className={`p-1 rounded-md transition-colors ${item.isPinned ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-indigo-400'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={item.isPinned ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
              
              <div className="flex justify-between items-end border-t border-slate-50 pt-3 mt-1">
                <div className="flex flex-col gap-1 overflow-hidden">
                  {/* Source Website Section */}
                  {item.sourceUrl && (
                    <div 
                      onClick={(e) => { e.stopPropagation(); chrome.tabs.create({ url: item.sourceUrl }); }}
                      className="flex items-center gap-1.5 text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      <img 
                        src={`https://www.google.com/s2/favicons?domain=${new URL(item.sourceUrl).hostname}&sz=32`} 
                        className="w-3.5 h-3.5 rounded-sm" 
                        alt=""
                      />
                      <span className="text-[10px] font-bold truncate max-w-35">
                        {item.sourceTitle || new URL(item.sourceUrl).hostname}
                      </span>
                    </div>
                  )}
                  <span className="text-[9px] text-slate-400 font-semibold">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {isLink && (
                  <button 
                    onClick={(e) => openLink(e, item.text)}
                    className="text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-sm font-bold hover:bg-indigo-700 transition-colors"
                  >
                    OPEN LINK
                  </button>
                )}
              </div>

              {copiedId === item.id && (
                <div className="absolute inset-0 bg-indigo-600/95 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xs font-bold tracking-widest uppercase">Copied!</span>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="text-center mt-10 text-slate-400 text-sm italic">
            No snippets collected yet.
          </div>
        )}
      </div>
      
      <footer className="p-2 bg-slate-100 text-center border-t border-slate-200">
         <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Alt + C to Open Clippa</p>
      </footer>
    </div>
  );
}