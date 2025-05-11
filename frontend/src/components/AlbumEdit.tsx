import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import './AlbumEdit.css';

interface Photo {
  id: string;
  url: string;
  name: string;
}

interface Sticker {
  id: string;
  url: string; // または画像パス
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

interface CropShape {
  x: number;
  y: number;
  width: number;
  height: number;
}

type DraggableItem =
  | { type: 'photo'; data: Photo }
  | { type: 'sticker'; data: Sticker };

const AlbumEdit: React.FC = () => {
  const [album, setAlbum] = useState<Album | null>(null);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]); // アップロードされた写真のリスト (サイドバー用)
  const [stickers, setStickers] = useState<Sticker[]>([]); // ステッカーのリスト (サイドバー用)
  const [albumObjects, setAlbumObjects] = useState<AlbumObject[]>([]); // 現在のページのオブジェクトリスト (キャンバス描画用)
  // const [draggedPhoto, setDraggedPhoto] = useState<Photo | null>(null); // draggedItemに置き換え
  const [draggedItem, setDraggedItem] = useState<DraggableItem | null>(null);
  const [selectedObject, setSelectedObject] = useState<AlbumObject | null>(null);
  const [cropMode, setCropMode] = useState<'shape' | 'freehand' | null>(null);
  const [cropShape, setCropShape] = useState<CropShape | null>(null);
  const [activeTab, setActiveTab] = useState<'photos' | 'stickers'>('photos');
  const [editingText, setEditingText] = useState<string>('');
  const [isTextEditing, setIsTextEditing] = useState<boolean>(false);
  const [currentTextObjectId, setCurrentTextObjectId] = useState<string | null>(null);
  const [currentTextStyle, setCurrentTextStyle] = useState({
    font: 'Arial',
    size: 16,
    color: '#000000',
    bold: false,
  });

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

          // 仮のステッカーデータ
          setStickers([
            { id: 'sticker1', url: 'https://via.placeholder.com/50x50.png?text=S1', name: 'Sticker 1' },
            { id: 'sticker2', url: 'https://via.placeholder.com/50x50.png?text=S2', name: 'Sticker 2' },
            { id: 'sticker3', url: 'https://via.placeholder.com/50x50.png?text=S3', name: 'Sticker 3' },
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

  const handleItemDragStart = (e: React.DragEvent<HTMLDivElement>, item: Photo | Sticker, type: 'photo' | 'sticker') => {
    setDraggedItem({ type, data: item });
    e.dataTransfer.setData('application/json', JSON.stringify({ type, id: item.id }));
    console.log(`Drag started: ${type}`, item);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // ドロップを許可するために必要
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!draggedItem || !album?.albumId || !currentPageId) {
      console.error('No item dragged, albumId missing, or currentPageId missing');
      return;
    }

    const canvasRect = e.currentTarget.getBoundingClientRect();
    const positionX = e.clientX - canvasRect.left;
    const positionY = e.clientY - canvasRect.top;

    console.log(`${draggedItem.type} dropped:`, draggedItem.data, 'at', positionX, positionY);

    const token = localStorage.getItem('token');
    if (!token) {
      alert('認証トークンがありません。再度ログインしてください。');
      return;
    }

    let newObjectDataPayload: any;
    let objectType: 'photo' | 'sticker';
    let itemWidth = 100;
    let itemHeight = 100;

    if (draggedItem.type === 'photo') {
      objectType = 'photo';
      newObjectDataPayload = {
        photoId: draggedItem.data.id,
        cropInfo: {},
      };
    } else if (draggedItem.type === 'sticker') {
      objectType = 'sticker';
      itemWidth = 50; // ステッカーのデフォルトサイズ
      itemHeight = 50;
      newObjectDataPayload = {
        stickerId: draggedItem.data.id,
        // sticker固有の他の情報があればここに追加
      };
    } else {
      console.error('Unknown dragged item type');
      setDraggedItem(null);
      return;
    }

    const newObjectRequest = {
      pageId: currentPageId,
      type: objectType,
      positionX: Math.round(positionX - itemWidth / 2), // 中央に配置
      positionY: Math.round(positionY - itemHeight / 2), // 中央に配置
      width: itemWidth,
      height: itemHeight,
      rotation: 0,
      zIndex: albumObjects.length,
      contentData: JSON.stringify(newObjectDataPayload),
    };

    try {
      const response = await fetch(`/api/albums/${album.albumId}/objects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newObjectRequest),
      });

      if (response.ok) {
        const responseObject: AlbumObject = await response.json();
        console.log('Object added successfully:', responseObject);
        setAlbumObjects(prevObjects => [...prevObjects, responseObject]);
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
        alert(`${draggedItem.type === 'photo' ? '写真' : 'ステッカー'}の配置に失敗しました: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('Error adding object:', error);
      alert(`${draggedItem.type === 'photo' ? '写真' : 'ステッカー'}の配置中にエラーが発生しました。`);
    }
    setDraggedItem(null); // ドラッグ状態をリセット
  };

  const handleSelectObject = (obj: AlbumObject) => {
    setSelectedObject(obj);
    console.log('Object selected:', obj);
  };

  const handleCropButtonClick = () => {
    if (selectedObject && selectedObject.type === 'photo') {
      // TODO: Implement crop mode selection UI
      console.log('Crop button clicked for photo:', selectedObject);
      // 仮で 'shape' モードに設定し、cropShapeを初期化
      setCropMode('shape');
      setCropShape({
        x: selectedObject.width * 0.1, // オブジェクトの左上から10%の位置
        y: selectedObject.height * 0.1, // オブジェクトの左上から10%の位置
        width: selectedObject.width * 0.8, // オブジェクトの幅の80%
        height: selectedObject.height * 0.8, // オブジェクトの高さの80%
      });
      alert(`写真 ${selectedObject.objectId} の図形切り取りを開始します。(実装途中)`);
    } else {
      alert('切り取り対象の写真オブジェクトを選択してください。');
    }
  };

  const handleConfirmCrop = async () => {
    if (!selectedObject || !cropShape || !album?.albumId || !currentPageId) {
      alert('切り取り対象のオブジェクトまたは切り取り範囲が指定されていません。');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('認証トークンがありません。再度ログインしてください。');
      return;
    }

    // contentDataをパース試行、失敗時は空オブジェクト
    let currentContentData = {};
    try {
      currentContentData = JSON.parse(selectedObject.contentData || '{}');
    } catch (e) {
      console.warn('Failed to parse existing contentData, starting fresh.', e);
    }


    const updatedContentData = {
      ...currentContentData,
      cropInfo: { // cropInfoにcropShapeの値を設定
        type: 'rectangle', // 切り取り形状のタイプ
        x: Math.round(cropShape.x),
        y: Math.round(cropShape.y),
        width: Math.round(cropShape.width),
        height: Math.round(cropShape.height),
      },
    };

    const objectToUpdate = {
      ...selectedObject,
      contentData: JSON.stringify(updatedContentData), // 再度文字列に変換
    };

    console.log('Attempting to update object with crop info:', objectToUpdate);

    try {
      const response = await fetch(`/api/albums/${album.albumId}/objects/${selectedObject.objectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ // API仕様に合わせて、更新するフィールドのみを送信
          positionX: selectedObject.positionX,
          positionY: selectedObject.positionY,
          width: selectedObject.width,
          height: selectedObject.height,
          rotation: selectedObject.rotation,
          zIndex: selectedObject.zIndex,
          contentData: objectToUpdate.contentData, // 更新されたcontentData
        }),
      });

      if (response.ok) {
        const updatedObjectFromServer: AlbumObject = await response.json();
        console.log('Object updated successfully:', updatedObjectFromServer);

        // フロントエンドの状態を更新
        const updatedObjects = albumObjects.map(obj =>
          obj.objectId === updatedObjectFromServer.objectId ? updatedObjectFromServer : obj
        );
        setAlbumObjects(updatedObjects);

        if (album) {
          const updatedPages = album.pages.map(page => {
            if (page.pageId === currentPageId) {
              return { ...page, objects: updatedObjects };
            }
            return page;
          });
          setAlbum({ ...album, pages: updatedPages });
        }

        alert('写真の切り取り情報が保存されました。');
      } else {
        const errorData = await response.json();
        console.error('Failed to update object:', response.status, errorData);
        alert(`切り取り情報の保存に失敗しました: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('Error updating object:', error);
      alert('切り取り情報の保存中にエラーが発生しました。');
    } finally {
      // 状態をリセット
      setCropMode(null);
      setCropShape(null);
      setSelectedObject(null);
    }
  };

  const handleTabChange = (tab: 'photos' | 'stickers') => {
    setActiveTab(tab);
  };

  const handleAddTextObject = async () => {
    if (!album?.albumId || !currentPageId) {
      alert('アルバムまたはページが選択されていません。');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      alert('認証トークンがありません。再度ログインしてください。');
      return;
    }

    const newTextObjectRequest = {
      pageId: currentPageId,
      type: 'text' as 'text', // 型アサーション
      positionX: 50, // 仮の初期位置
      positionY: 50, // 仮の初期位置
      width: 200,    // 仮の初期サイズ
      height: 50,    // 仮の初期サイズ
      rotation: 0,
      zIndex: albumObjects.length,
      contentData: JSON.stringify({
        text: '新しいテキスト',
        font: 'Arial',
        size: 16,
        color: '#000000',
        bold: false,
      }),
    };

    try {
      const response = await fetch(`/api/albums/${album.albumId}/objects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTextObjectRequest),
      });

      if (response.ok) {
        const newObject: AlbumObject = await response.json();
        setAlbumObjects(prev => [...prev, newObject]);
        if (album) {
          const updatedPages = album.pages.map(page => {
            if (page.pageId === currentPageId) {
              return { ...page, objects: [...page.objects, newObject] };
            }
            return page;
          });
          setAlbum({ ...album, pages: updatedPages });
        }
        console.log('Text object added:', newObject);
      } else {
        const errorData = await response.json();
        alert(`テキストオブジェクトの追加に失敗しました: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('Error adding text object:', error);
      alert('テキストオブジェクトの追加中にエラーが発生しました。');
    }
  };

  const handleTextObjectClick = (obj: AlbumObject) => {
    if (obj.type === 'text') {
      setSelectedObject(obj);
      setIsTextEditing(true);
      setEditingText(obj.contentData.text || '');
      setCurrentTextObjectId(obj.objectId);
      setCurrentTextStyle({
        font: obj.contentData.font || 'Arial',
        size: obj.contentData.size || 16,
        color: obj.contentData.color || '#000000',
        bold: obj.contentData.bold || false,
      });
      console.log('Text object selected for editing:', obj);
    }
  };

  const handleTextEditComplete = async () => {
    if (!selectedObject || !album?.albumId || !currentTextObjectId || selectedObject.type !== 'text') {
      setIsTextEditing(false);
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      alert('認証トークンがありません。');
      setIsTextEditing(false);
      return;
    }

    const updatedContentData = {
      ...selectedObject.contentData,
      text: editingText,
      font: currentTextStyle.font,
      size: currentTextStyle.size,
      color: currentTextStyle.color,
      bold: currentTextStyle.bold,
    };

    const objectToUpdate = {
      ...selectedObject,
      contentData: JSON.stringify(updatedContentData),
    };

    try {
      const response = await fetch(`/api/albums/${album.albumId}/objects/${currentTextObjectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ // 送信するデータはAPIの仕様に合わせる
          positionX: selectedObject.positionX,
          positionY: selectedObject.positionY,
          width: selectedObject.width,
          height: selectedObject.height,
          rotation: selectedObject.rotation,
          zIndex: selectedObject.zIndex,
          contentData: objectToUpdate.contentData,
        }),
      });

      if (response.ok) {
        const updatedObjectFromServer: AlbumObject = await response.json();
        setAlbumObjects(prevObjects =>
          prevObjects.map(obj =>
            obj.objectId === updatedObjectFromServer.objectId ? updatedObjectFromServer : obj
          )
        );
        if (album) {
          const updatedPages = album.pages.map(page => {
            if (page.pageId === currentPageId) {
              return {
                ...page,
                objects: page.objects.map(obj =>
                  obj.objectId === updatedObjectFromServer.objectId ? updatedObjectFromServer : obj
                ),
              };
            }
            return page;
          });
          setAlbum({ ...album, pages: updatedPages });
        }
        console.log('Text object updated successfully:', updatedObjectFromServer);
      } else {
        const errorData = await response.json();
        alert(`テキストオブジェクトの更新に失敗しました: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('Error updating text object:', error);
      alert('テキストオブジェクトの更新中にエラーが発生しました。');
    } finally {
      setIsTextEditing(false);
      setCurrentTextObjectId(null);
      // setSelectedObject(null); // 他の操作のために選択状態は維持するかもしれない
    }
  };

  const handleTextStyleChange = (styleProp: keyof typeof currentTextStyle, value: any) => {
    setCurrentTextStyle(prev => ({ ...prev, [styleProp]: value }));
    // 即時反映のために handleTextEditComplete を呼び出すか、編集中はローカルでスタイルを適用し、
    // 編集完了時にまとめて保存する。ここでは編集中はローカルでスタイルを適用する方針。
    if (selectedObject && selectedObject.type === 'text' && currentTextObjectId === selectedObject.objectId) {
        const updatedContentData = {
            ...selectedObject.contentData,
            text: editingText, // Keep current text
            font: styleProp === 'font' ? value : currentTextStyle.font,
            size: styleProp === 'size' ? value : currentTextStyle.size,
            color: styleProp === 'color' ? value : currentTextStyle.color,
            bold: styleProp === 'bold' ? value : currentTextStyle.bold,
        };
        // Update local preview immediately
        setAlbumObjects(prevObjects =>
            prevObjects.map(obj =>
                obj.objectId === currentTextObjectId
                    ? { ...obj, contentData: updatedContentData }
                    : obj
            )
        );
    }
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
        <button onClick={handleCropButtonClick}>画像切り取り</button>
        <button onClick={handleAddTextObject}>テキスト追加</button>
        <select value={currentTextStyle.font} onChange={(e) => handleTextStyleChange('font', e.target.value)} disabled={!isTextEditing || selectedObject?.type !== 'text'}>
          <option value="Arial">Arial</option>
          <option value="Verdana">Verdana</option>
          <option value="Times New Roman">Times New Roman</option>
          {/* 他のフォントオプション */}
        </select>
        <input type="number" value={currentTextStyle.size} onChange={(e) => handleTextStyleChange('size', parseInt(e.target.value))} disabled={!isTextEditing || selectedObject?.type !== 'text'} style={{width: '60px'}} />
        <input type="color" value={currentTextStyle.color} onChange={(e) => handleTextStyleChange('color', e.target.value)} disabled={!isTextEditing || selectedObject?.type !== 'text'} />
        <button onClick={() => handleTextStyleChange('bold', !currentTextStyle.bold)} disabled={!isTextEditing || selectedObject?.type !== 'text'} style={{ fontWeight: currentTextStyle.bold ? 'bold' : 'normal' }}>太字</button>
        <button>ペン</button>
        <select><option>太さ</option></select>
        <input type="color" />
        <button>オブジェクト選択</button>
        {cropMode === 'shape' && selectedObject && (
          <>
            <button onClick={handleConfirmCrop}>長方形で確定</button>
            <button onClick={() => { setCropMode(null); setCropShape(null); setSelectedObject(null); }}>キャンセル</button>
            {cropShape && (
              <div style={{ marginLeft: '10px', border: '1px solid #ccc', padding: '5px'}}>
                <small>Crop X: <input type="number" value={cropShape.x} onChange={e => setCropShape({...cropShape, x: parseInt(e.target.value)})} style={{width: '50px'}} /></small>
                <small>Y: <input type="number" value={cropShape.y} onChange={e => setCropShape({...cropShape, y: parseInt(e.target.value)})} style={{width: '50px'}} /></small>
                <small>W: <input type="number" value={cropShape.width} onChange={e => setCropShape({...cropShape, width: parseInt(e.target.value)})} style={{width: '50px'}} /></small>
                <small>H: <input type="number" value={cropShape.height} onChange={e => setCropShape({...cropShape, height: parseInt(e.target.value)})} style={{width: '50px'}}/></small>
              </div>
            )}
          </>
        )}
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
                  className={`album-object photo-object ${selectedObject?.objectId === obj.objectId ? 'selected' : ''}`}
                  style={commonStyle}
                  onClick={() => handleSelectObject(obj)}
                >
                  {photo ? <img src={photo.url} alt={photo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '写真読込エラー'}
                  {selectedObject?.objectId === obj.objectId && cropMode === 'shape' && (
                    <div className="crop-overlay-shape">
                      {cropShape && (
                        <div
                          className="crop-rectangle"
                          style={{
                            position: 'absolute',
                            left: `${cropShape.x}px`,
                            top: `${cropShape.y}px`,
                            width: `${cropShape.width}px`,
                            height: `${cropShape.height}px`,
                            border: '2px dashed yellow',
                            boxSizing: 'border-box',
                            cursor: 'move', // あとでリサイズハンドルなどを追加
                          }}
                        >
                          {/* リサイズハンドルなどをここに追加可能 */}
                        </div>
                      )}
                      <p style={{color: 'white', background: 'rgba(0,0,0,0.5)', padding: '5px', zIndex: 1}}>図形切り取り</p>
                    </div>
                  )}
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
                  className={`album-object text-object ${selectedObject?.objectId === obj.objectId ? 'selected' : ''}`}
                  style={{
                    ...commonStyle,
                    color: obj.contentData.color || '#000000',
                    fontSize: `${obj.contentData.size || 16}px`,
                    fontWeight: obj.contentData.bold ? 'bold' : 'normal',
                    fontFamily: obj.contentData.font || 'Arial',
                    border: selectedObject?.objectId === obj.objectId ? '2px solid blue' : '1px dashed #aaa',
                    padding: '5px',
                    boxSizing: 'border-box',
                    overflow: 'hidden', // Auto-sizing text might need different overflow
                    whiteSpace: 'pre-wrap',
                  }}
                  onClick={() => handleTextObjectClick(obj)}
                  onDoubleClick={() => handleTextObjectClick(obj)} // Consider double click for edit
                >
                  {isTextEditing && currentTextObjectId === obj.objectId ? (
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onBlur={handleTextEditComplete}
                      autoFocus
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        padding: '0',
                        margin: '0',
                        background: 'transparent',
                        outline: 'none',
                        resize: 'none', // Or allow resize and update object width/height
                        fontFamily: currentTextStyle.font,
                        fontSize: `${currentTextStyle.size}px`,
                        color: currentTextStyle.color,
                        fontWeight: currentTextStyle.bold ? 'bold' : 'normal',
                        boxSizing: 'border-box',
                      }}
                    />
                  ) : (
                    obj.contentData.text
                  )}
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
            <button className={activeTab === 'photos' ? 'active' : ''} onClick={() => handleTabChange('photos')}>写真</button>
            <button className={activeTab === 'stickers' ? 'active' : ''} onClick={() => handleTabChange('stickers')}>ステッカー</button>
          </div>
          <div className="sidebar-content">
            {activeTab === 'photos' && (
              <>
                <p>アップロード済み写真:</p>
                {photos.map(photo => (
                  <div
                    key={photo.id}
                    className="sidebar-item sidebar-photo-item"
                    draggable="true"
                    onDragStart={(e) => handleItemDragStart(e, photo, 'photo')}
                    style={{ cursor: 'grab', marginBottom: '5px', border: '1px solid #eee', padding: '5px', display: 'flex', alignItems: 'center' }}
                  >
                    <img src={photo.url} alt={photo.name} style={{ width: '50px', height: '50px', marginRight: '10px', objectFit: 'cover' }} />
                    <span>{photo.name}</span>
                  </div>
                ))}
              </>
            )}
            {activeTab === 'stickers' && (
              <>
                <p>ステッカー:</p>
                {stickers.map(sticker => (
                  <div
                    key={sticker.id}
                    className="sidebar-item sidebar-sticker-item"
                    draggable="true"
                    onDragStart={(e) => handleItemDragStart(e, sticker, 'sticker')}
                    style={{ cursor: 'grab', marginBottom: '5px', border: '1px solid #eee', padding: '5px', display: 'flex', alignItems: 'center' }}
                  >
                    <img src={sticker.url} alt={sticker.name} style={{ width: '40px', height: '40px', marginRight: '10px', objectFit: 'contain' }} />
                    <span>{sticker.name}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default AlbumEdit;