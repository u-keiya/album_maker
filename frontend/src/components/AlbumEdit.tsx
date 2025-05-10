import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './AlbumEdit.css';

interface Photo {
  id: string;
  url: string;
  name: string;
}

interface AlbumObject {
  objectId: string;
  pageId: string;
  type: 'photo' | 'sticker' | 'text' | 'drawing';
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  contentData: any;
  createdAt: string;
  updatedAt: string;
}

// 仮のページ情報。実際にはAPIから取得または状態管理する
const MOCK_CURRENT_PAGE_ID = "mock-page-id-123";

const AlbumEdit: React.FC = () => {
  const [albumId, setAlbumId] = useState<string | undefined>(undefined);
  const [photos, setPhotos] = useState<Photo[]>([]); // アップロードされた写真のリスト
  const [albumObjects, setAlbumObjects] = useState<AlbumObject[]>([]); // キャンバス上のオブジェクト
  const [draggedPhoto, setDraggedPhoto] = useState<Photo | null>(null);

  const params = useParams();

  useEffect(() => {
    if (params.albumId) {
      setAlbumId(params.albumId);
      console.log('Album ID set:', params.albumId);
      // TODO: 本来はここでアルバムの詳細情報（ページ、オブジェクト、アップロード済み写真リストなど）をAPIから取得する
      // 仮の写真データをセット
      setPhotos([
        { id: 'photo1', url: 'https://via.placeholder.com/100x100.png?text=Photo+1', name: 'Photo 1' },
        { id: 'photo2', url: 'https://via.placeholder.com/100x100.png?text=Photo+2', name: 'Photo 2' },
        { id: 'photo3', url: 'https://via.placeholder.com/100x100.png?text=Photo+3', name: 'Photo 3' },
      ]);
    } else {
      console.error('Album ID not found in params');
      alert('アルバムIDがURLに含まれていません。');
    }
  }, [params.albumId]);


  const handleAddPage = async () => {
    console.log('Attempting to add page. Album ID:', albumId);
    const token = localStorage.getItem('token');
    console.log('Token:', token);

    if (!albumId) {
      console.error('Album ID is not available.');
      alert('アルバムIDが取得できません。URLを確認してください。');
      return;
    }
    if (!token) {
      console.error('Authentication token is not available.');
      alert('認証トークンがありません。再度ログインしてください。');
      return;
    }

    try {
      const response = await fetch(`/api/albums/${albumId}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Page added successfully:', data);
        // TODO: ページリストを更新する処理
      } else {
        const errorData = await response.json();
        console.error('Failed to add page:', response.status, errorData);
        alert(`ページの追加に失敗しました: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('Error adding page:', error);
      alert('ページの追加中にエラーが発生しました。');
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, photo: Photo) => {
    setDraggedPhoto(photo);
    e.dataTransfer.setData('text/plain', photo.id); // ドラッグデータとしてphotoIdを設定
    console.log('Drag started:', photo);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // ドロップを許可するために必要
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedPhoto || !albumId) {
      console.error('No photo dragged or albumId missing');
      return;
    }

    const canvasRect = e.currentTarget.getBoundingClientRect();
    const positionX = e.clientX - canvasRect.left;
    const positionY = e.clientY - canvasRect.top;

    console.log('Photo dropped:', draggedPhoto, 'at', positionX, positionY);

    const token = localStorage.getItem('token');
    if (!token) {
      alert('認証トークンがありません。再度ログインしてください。');
      return;
    }

    // 仮のオブジェクトデータ。サイズや回転などは適宜調整
    const newObjectData = {
      pageId: MOCK_CURRENT_PAGE_ID, // 現在のページIDを使用
      type: 'photo' as 'photo',
      positionX: Math.round(positionX),
      positionY: Math.round(positionY),
      width: 100, // 仮の幅
      height: 100, // 仮の高さ
      rotation: 0,
      zIndex: albumObjects.length, // 重なり順を適当に設定
      contentData: {
        photoId: draggedPhoto.id,
        cropInfo: {} // 空のcropInfoを追加
      },
    };

    try {
      const response = await fetch(`/api/albums/${albumId}/objects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newObjectData),
      });

      if (response.ok) {
        const responseObject: AlbumObject = await response.json();
        console.log('Object added successfully:', responseObject);
        setAlbumObjects(prevObjects => [...prevObjects, responseObject]);
        // TODO: キャンバス上のオブジェクトを再描画
      } else {
        const errorData = await response.json();
        console.error('Failed to add object:', response.status, errorData);
        alert(`写真の配置に失敗しました: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('Error adding object:', error);
      alert('写真の配置中にエラーが発生しました。');
    }
    setDraggedPhoto(null); // ドラッグ状態をリセット
  };


  return (
    <div className="album-edit-container">
      <header className="album-edit-header">
        <button className="back-button">戻る</button>
        <h1>アルバム編集 (ID: {albumId || 'N/A'})</h1>
      </header>
      <div className="album-edit-toolbar">
        <button>ダウンロード</button>
        <button>保存</button>
        <button onClick={handleAddPage}>ページ追加</button>
        <button>画像切り取り</button>
        <button>テキスト追加</button>
        <select><option>フォント</option></select>
        <select><option>サイズ</option></select>
        <input type="color" />
        <button>太字</button>
        <button>ペン</button>
        <select><option>太さ</option></select>
        <input type="color" />
        <button>オブジェクト選択</button>
      </div>
      <main className="album-edit-main">
        <div
          className="album-edit-canvas"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <p>ここにアルバムのページが表示されます。写真をドラッグ＆ドロップしてください。</p>
          {/* 配置されたオブジェクトを描画 */}
          {albumObjects.filter(obj => obj.pageId === MOCK_CURRENT_PAGE_ID && obj.type === 'photo').map(obj => {
            const photo = photos.find(p => p.id === obj.contentData.photoId);
            return (
              <div
                key={obj.objectId}
                className="album-object photo-object"
                style={{
                  position: 'absolute',
                  left: `${obj.positionX}px`,
                  top: `${obj.positionY}px`,
                  width: `${obj.width}px`,
                  height: `${obj.height}px`,
                  transform: `rotate(${obj.rotation}deg)`,
                  zIndex: obj.zIndex,
                  border: '1px solid #ccc', // 仮のスタイル
                }}
              >
                {photo ? <img src={photo.url} alt={photo.name} style={{ width: '100%', height: '100%' }} /> : '写真読込エラー'}
              </div>
            );
          })}
        </div>
        <aside className="album-edit-sidebar">
          <div className="sidebar-tabs">
            <button className="active">写真</button>
            <button>ステッカー</button>
          </div>
          <div className="sidebar-content">
            <p>アップロード済み写真:</p>
            {photos.map(photo => (
              <div
                key={photo.id}
                className="sidebar-photo-item"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, photo)}
                style={{ cursor: 'grab', marginBottom: '5px', border: '1px solid #eee', padding: '5px' }}
              >
                <img src={photo.url} alt={photo.name} style={{ width: '50px', height: '50px', marginRight: '10px' }} />
                <span>{photo.name}</span>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default AlbumEdit;