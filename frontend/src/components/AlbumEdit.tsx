import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './AlbumEdit.css';

interface Photo {
  id: string;
  url: string;
  name: string;
}

interface AlbumPage {
  pageId: string;
  pageNumber: number;
  objects: AlbumObject[];
}

interface Album {
  albumId: string;
  title: string;
  pages: AlbumPage[];
  // 他のアルバム情報があれば追加
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

const AlbumEdit: React.FC = () => {
  const [album, setAlbum] = useState<Album | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]); // アップロードされた写真のリスト (サイドバー用)
  const [albumObjects, setAlbumObjects] = useState<AlbumObject[]>([]); // 現在のページのオブジェクトリスト (キャンバス描画用)
  const [draggedPhoto, setDraggedPhoto] = useState<Photo | null>(null);

  const params = useParams();
  const albumIdFromParams = params.albumId;

  useEffect(() => {
    const fetchAlbumData = async () => {
      if (albumIdFromParams) {
        const token = localStorage.getItem('token');
        if (!token) {
          alert('認証トークンがありません。再度ログインしてください。');
          return;
        }
        try {
          // アルバム詳細情報の取得
          const albumResponse = await fetch(`/api/albums/${albumIdFromParams}`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!albumResponse.ok) {
            throw new Error(`アルバム情報の取得に失敗しました: ${albumResponse.status}`);
          }
          const albumData: Album = await albumResponse.json();
          setAlbum(albumData);
          if (albumData.pages && albumData.pages.length > 0) {
            // 初期表示ページIDを設定
            const initialPageId = albumData.pages[0].pageId;
            setCurrentPageId(initialPageId);
            // 初期表示ページのオブジェクトをセット
            const initialPageObjects = albumData.pages.find(p => p.pageId === initialPageId)?.objects || [];
            setAlbumObjects(initialPageObjects);
          }

          // アップロード済み写真リストの取得 (仮。実際には専用APIを叩くか、アルバム情報に含まれる)
          // この部分は既存の仮データセットアップを流用しつつ、API連携の準備としてコメントアウト
          // const photosResponse = await fetch(`/api/photos?userId=${/* userId */} `, { // userIdの取得方法に注意
          //   headers: { 'Authorization': `Bearer ${token}` },
          // });
          // if (!photosResponse.ok) {
          //   throw new Error(`写真リストの取得に失敗しました: ${photosResponse.status}`);
          // }
          // const photosData: Photo[] = await photosResponse.json();
          // setPhotos(photosData);
          setPhotos([ // 仮の写真データ
            { id: 'photo1', url: 'https://via.placeholder.com/100x100.png?text=Photo+1', name: 'Photo 1' },
            { id: 'photo2', url: 'https://via.placeholder.com/100x100.png?text=Photo+2', name: 'Photo 2' },
            { id: 'photo3', url: 'https://via.placeholder.com/100x100.png?text=Photo+3', name: 'Photo 3' },
          ]);

        } catch (error) {
          console.error('Error fetching album data:', error);
          alert(`データの取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else {
        console.error('Album ID not found in params');
        alert('アルバムIDがURLに含まれていません。');
      }
    };

    fetchAlbumData();
  }, [albumIdFromParams]);

  // currentPageIdが変更されたら、表示するオブジェクトを更新
  useEffect(() => {
    if (album && currentPageId) {
      const currentPage = album.pages.find(p => p.pageId === currentPageId);
      setAlbumObjects(currentPage?.objects || []);
    }
  }, [currentPageId, album]);


  const handleAddPage = async () => {
    console.log('Attempting to add page. Album ID:', album?.albumId);
    const token = localStorage.getItem('token');
    console.log('Token:', token);

    if (!album?.albumId) {
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
      const response = await fetch(`/api/albums/${album.albumId}/pages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const newPageData = await response.json();
        console.log('Page added successfully:', newPageData);
        if (album) {
          const newPage: AlbumPage = {
            pageId: newPageData.pageId,
            pageNumber: newPageData.pageNumber,
            objects: []
          };
          const updatedAlbum = {
            ...album,
            pages: [...album.pages, newPage].sort((a, b) => a.pageNumber - b.pageNumber)
          };
          setAlbum(updatedAlbum);
          setCurrentPageId(newPage.pageId); // 新しく追加したページを表示
        }
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
    if (!draggedPhoto || !album?.albumId || !currentPageId) {
      console.error('No photo dragged, albumId missing, or currentPageId missing');
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

    const newObjectData = {
      pageId: currentPageId,
      type: 'photo' as 'photo',
      positionX: Math.round(positionX),
      positionY: Math.round(positionY),
      width: 100,
      height: 100,
      rotation: 0,
      zIndex: albumObjects.length,
      contentData: JSON.stringify({ // contentDataを文字列に変換
        photoId: draggedPhoto.id,
        cropInfo: {},
      }),
    };

    try {
      const response = await fetch(`/api/albums/${album.albumId}/objects`, {
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
        // アルバム全体のstateも更新 (オプション、状況による)
        if (album) {
          const updatedPages = album.pages.map(page => {
            if (page.pageId === currentPageId) {
              return { ...page, objects: [...page.objects, responseObject] };
            }
            return page;
          });
          setAlbum({ ...album, pages: updatedPages });
        }
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
        <h1>アルバム編集 (ID: {album?.albumId || 'N/A'})</h1>
        <div>
          ページ:
          <select value={currentPageId || ''} onChange={(e) => setCurrentPageId(e.target.value)}>
            {album?.pages.map(page => (
              <option key={page.pageId} value={page.pageId}>
                {page.pageNumber}
              </option>
            ))}
          </select>
        </div>
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
          {/* 配置されたオブジェクトを描画 */}
          {albumObjects.map(obj => {
            const commonStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${obj.positionX}px`,
              top: `${obj.positionY}px`,
              width: `${obj.width}px`,
              height: `${obj.height}px`,
              transform: `rotate(${obj.rotation}deg)`,
              zIndex: obj.zIndex,
              border: '1px solid #ccc', // 共通スタイル
            };

            if (obj.type === 'photo') {
              const photo = photos.find(p => p.id === obj.contentData.photoId);
              return (
                <div
                  key={obj.objectId}
                  className="album-object photo-object"
                  style={commonStyle}
                >
                  {photo ? <img src={photo.url} alt={photo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '写真読込エラー'}
                </div>
              );
            } else if (obj.type === 'sticker') {
              // ステッカーの描画 (contentData.stickerId を使用)
              return (
                <div
                  key={obj.objectId}
                  className="album-object sticker-object"
                  style={{ ...commonStyle, backgroundColor: 'lightblue' /* 仮のスタイル */ }}
                >
                  Sticker: {obj.contentData.stickerId}
                </div>
              );
            } else if (obj.type === 'text') {
              // テキストの描画 (contentData.text, font, size, color, bold を使用)
              return (
                <div
                  key={obj.objectId}
                  className="album-object text-object"
                  style={{
                    ...commonStyle,
                    color: obj.contentData.color || '#000000',
                    fontSize: `${obj.contentData.size || 16}px`,
                    fontWeight: obj.contentData.bold ? 'bold' : 'normal',
                    fontFamily: obj.contentData.font || 'Arial',
                    border: '1px dashed #aaa', // テキストオブジェクトの枠
                    padding: '5px',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap', // 改行を保持
                  }}
                >
                  {obj.contentData.text}
                </div>
              );
            } else if (obj.type === 'drawing') {
              // 描画オブジェクトの描画 (contentData.pathData, color, thickness を使用 - SVGなどで描画)
              // ここでは単純なプレースホルダー
              return (
                <div
                  key={obj.objectId}
                  className="album-object drawing-object"
                  style={{ ...commonStyle, border: `2px solid ${obj.contentData.color || 'red'}` /* 仮のスタイル */ }}
                >
                  Drawing
                  {/* <svg width="100%" height="100%" viewBox={`0 0 ${obj.width} ${obj.height}`}>
                    <path d={obj.contentData.pathData} stroke={obj.contentData.color} strokeWidth={obj.contentData.thickness} fill="none" />
                  </svg> */}
                </div>
              );
            }
            return null; // 未知のタイプは描画しない
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