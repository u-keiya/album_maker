import React from 'react';
import './AlbumEdit.css'; // CSSファイルをインポート

const AlbumEdit: React.FC = () => {
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
        <button>ページ追加</button>
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