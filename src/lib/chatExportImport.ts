import { ChatExportData, ChatImportResult } from '../types/chat';

/**
 * チャットデータをJSONファイルとしてエクスポート
 */
export async function exportChatsToFile(data: ChatExportData): Promise<void> {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * JSONファイルからチャットデータをインポート
 */
export async function importChatsFromFile(): Promise<ChatImportResult> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        resolve({
          success: false,
          importedChatsCount: 0,
          error: 'ファイルが選択されていません',
        });
        return;
      }

      try {
        const text = await file.text();
        const data = JSON.parse(text) as ChatExportData;

        // バージョンチェック
        if (!data.version || !data.chats || !Array.isArray(data.chats)) {
          resolve({
            success: false,
            importedChatsCount: 0,
            error: '無効なファイル形式です',
          });
          return;
        }

        resolve({
          success: true,
          importedChatsCount: data.chats.length,
        });
      } catch (error) {
        resolve({
          success: false,
          importedChatsCount: 0,
          error: 'ファイルの読み込み中にエラーが発生しました',
        });
      }
    };

    input.click();
  });
}

/**
 * チャットデータをクリップボードにコピー
 */
export async function copyChatsToClipboard(data: ChatExportData): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('クリップボードへのコピーに失敗しました:', error);
    return false;
  }
}

/**
 * クリップボードからチャットデータを読み込み
 */
export async function pasteChatsFromClipboard(): Promise<ChatImportResult> {
  try {
    const text = await navigator.clipboard.readText();
    const data = JSON.parse(text) as ChatExportData;

    if (!data.version || !data.chats || !Array.isArray(data.chats)) {
      return {
        success: false,
        importedChatsCount: 0,
        error: '無効なデータ形式です',
      };
    }

    return {
      success: true,
      importedChatsCount: data.chats.length,
    };
  } catch (error) {
    return {
      success: false,
      importedChatsCount: 0,
      error: 'クリップボードからの読み込みに失敗しました',
    };
  }
}

// ChatHeader.tsxで使用される関数のエイリアス
export const downloadChats = exportChatsToFile;
export const readChatFile = importChatsFromFile;
export const importChats = async (data: ChatExportData): Promise<ChatImportResult> => {
  if (!data.version || !data.chats || !Array.isArray(data.chats)) {
    return {
      success: false,
      importedChatsCount: 0,
      error: '無効なデータ形式です',
    };
  }

  return {
    success: true,
    importedChatsCount: data.chats.length,
  };
};