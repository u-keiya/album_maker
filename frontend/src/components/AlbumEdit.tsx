import React from 'react';
import { useParams } from 'react-router-dom'; // useParamsをインポート
import './AlbumEdit.css'; // CSSファイルをインポート

const AlbumEdit: React.FC = () => {
  let albumId: string | undefined;
  try {
    const params = useParams();
    albumId = params.albumId;
    console.log('useParams successful. Album ID from params:', albumId); // useParams成功ログ
  } catch (e) {
    console.error('Error calling useParams:', e); // useParamsエラーログ
    alert('ルーティングパラメータの取得に失敗しました。');
    // この場合、albumIdはundefinedのまま
  }

  const handleAddPage = async () => {
    console.log('Attempting to add page. Album ID:', albumId); // デバッグログ追加
    const token = localStorage.getItem('token');
    console.log('Token:', token); // デバッグログ追加

    if (!albumId) {
      console.error('Album ID is not available.');
      alert('アルバムIDが取得できません。URLを確認してください。'); // ユーザーへのフィードバック追加
      return;
    }
    if (!token) {
      console.error('Authentication token is not available.');
      alert('認証トークンがありません。再度ログインしてください。'); // ユーザーへのフィードバック追加
      // ここでログインページへのリダイレクトなどを検討
      return;
    }

    try {
      const response = await fetch(`/api/albums/${albumId}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json', // 必要に応じて
        },
        // body: JSON.stringify({}), // リクエストボディが必要な場合
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Page added successfully:', data);
        // ここでページリストの更新などの処理を追加
      } else {
        const errorData = await response.json();
        console.error('Failed to add page:', response.status, errorData);
        // エラーハンドリング
      }
    } catch (error) {
      console.error('Error adding page:', error);
      // ネットワークエラーなどのハンドリング
    }
  };

  return (
    <div className="album-edit-container">
      <header className="album-edit-header">
        <button className="back-button">戻る</button>
        <h1>アルバム編集</h1>
      </header>
      <div className="album-edit-toolbar">
        {/* ツールバーの要素をここに追加 */}
        <button>ダウンロード</button>
        <button>保存</button>
        <button onClick={handleAddPage}>ページ追加</button>
        <button>画像切り取り</button>
        {/* テキストツール */}
        <button>テキスト追加</button>
        <select>
          <option>フォント</option>
        </select>
        <select>
          <option>サイズ</option>
        </select>
        <input type="color" />
        <button>太字</button>
        {/* 描画ツール */}
        <button>ペン</button>
        <select>
          <option>太さ</option>
        </select>
        <input type="color" />
        {/* 選択ツール */}
        <button>オブジェクト選択</button>
      </div>
      <main className="album-edit-main">
        <div className="album-edit-canvas">
          {/* キャンバスエリア */}
          <p>ここにアルバムのページが表示されます。</p>
        </div>
        <aside className="album-edit-sidebar">
          <div className="sidebar-tabs">
            <button className="active">写真</button>
            <button>ステッカー</button>
          </div>
          <div className="sidebar-content">
            {/* タブに応じたコンテンツ */}
            <p>ここに写真やステッカーの一覧が表示されます。</p>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default AlbumEdit;