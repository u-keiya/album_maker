import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom'; // useNavigate をインポート
import './AlbumEdit.css';

interface Photo {
  photoId: string; // id から photoId に変更
  url: string;
  name: string;
}

interface Sticker {
  stickerId: string; // id から stickerId に変更
  imageUrl: string; // または画像パス
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
  userId: string; // userIdを追加
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
  const [isDraggingObject, setIsDraggingObject] = useState<boolean>(false);
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number } | null>(null);
  const [isResizingObject, setIsResizingObject] = useState<boolean>(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null); //例: 'topLeft', 'bottomRight'
  const [objectInitialState, setObjectInitialState] = useState<AlbumObject | null>(null); // リサイズ開始時のオブジェクトの状態
  const [isRotatingObject, setIsRotatingObject] = useState<boolean>(false);
  const [rotationStartAngle, setRotationStartAngle] = useState<number>(0);
  const [objectCenter, setObjectCenter] = useState<{ x: number; y: number } | null>(null);
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

  // Drawing states
  const [drawingMode, setDrawingMode] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [penColor, setPenColor] = useState<string>('#000000');
  const [penThickness, setPenThickness] = useState<number>(2);

  const canvasRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate(); // useNavigateフックを使用


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
          let albumData: Album = await albumResponse.json();

          // Parse contentData for all objects in all pages
          if (albumData && albumData.pages) {
            albumData = {
              ...albumData,
              pages: albumData.pages.map(page => ({
                ...page,
                objects: page.objects.map(obj => {
                  try {
                    return {
                      ...obj,
                      contentData: typeof obj.contentData === 'string' ? JSON.parse(obj.contentData) : obj.contentData,
                    };
                  } catch (e) {
                    console.error('Failed to parse contentData for object:', obj.objectId, e);
                    return { ...obj, contentData: {} }; // Set to empty object on parse error
                  }
                }),
              })),
            };
          }

          setAlbum(albumData);
          if (albumData.pages && albumData.pages.length > 0) {
            // 初期表示ページIDを設定
            const initialPageId = albumData.pages[0].pageId;
            setCurrentPageId(initialPageId);
            // 初期表示ページのオブジェクトをセット
            const initialPage = albumData.pages.find(p => p.pageId === initialPageId);
            setAlbumObjects(initialPage?.objects || []);
          }

          // アップロード済み写真リストの取得 (実際のAPIエンドポイントを想定)
          // userIdをlocalStorageから取得する（応急処置）
          const storedUserId = localStorage.getItem('userId');
          if (!storedUserId) {
            console.warn('localStorageにuserIdが見つかりません。写真リストの取得をスキップします。');
            setPhotos([ // モックデータでフォールバック
              { photoId: 'photo1', url: 'https://via.placeholder.com/100x100.png?text=Photo+1', name: 'Photo 1' },
              { photoId: 'photo2', url: 'https://via.placeholder.com/100x100.png?text=Photo+2', name: 'Photo 2' },
              { photoId: 'photo3', url: 'https://via.placeholder.com/100x100.png?text=Photo+3', name: 'Photo 3' },
            ]);
          } else {
            const photosResponse = await fetch(`/api/photos?userId=${storedUserId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!photosResponse.ok) {
            // エラーでも処理を続行するが、コンソールには警告を出す
            console.warn(`アップロード済み写真リストの取得に失敗しました: ${photosResponse.status}. モックデータを使用します。`);
            setPhotos([
              { photoId: 'photo1', url: 'https://via.placeholder.com/100x100.png?text=Photo+1', name: 'Photo 1' },
              { photoId: 'photo2', url: 'https://via.placeholder.com/100x100.png?text=Photo+2', name: 'Photo 2' },
              { photoId: 'photo3', url: 'https://via.placeholder.com/100x100.png?text=Photo+3', name: 'Photo 3' },
            ]);
          } else {
              const rawPhotosData: any[] = await photosResponse.json();
              const mappedPhotosData: Photo[] = rawPhotosData.map(photo => ({
                photoId: photo.photo_id || photo.id, // photo_id を優先、なければ id
                url: photo.file_path || photo.url, // file_path を優先、なければ url
                name: photo.original_filename || photo.name,
              }));
              setPhotos(mappedPhotosData);
            }
          }

          // ステッカーリストの取得
          const stickersResponse = await fetch(`/api/stickers`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!stickersResponse.ok) {
            throw new Error(`ステッカーリストの取得に失敗しました: ${stickersResponse.status}`);
          }
          const rawStickersData: any[] = await stickersResponse.json(); // 一旦anyで受ける
          // バックエンドのプロパティ名をフロントエンドのStickerインターフェースにマッピング
          const mappedStickersData: Sticker[] = rawStickersData.map(sticker => ({
            stickerId: sticker.sticker_id || sticker.id, // sticker_idをstickerIdに
            imageUrl: sticker.file_path || sticker.imageUrl, // file_pathをimageUrlに (SAS付きであることを期待)
            name: sticker.name,
          }));
          setStickers(mappedStickersData);
          console.log('%c[Fetch] Mapped stickers for sidebar:', 'color: purple', mappedStickersData);

        } catch (error) { // このcatchブロックはtryに対応しています
          console.error('Error fetching album data:', error);
          alert(`データの取得中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
        } // try...catchの終了
      } else { // if (albumIdFromParams) の else節
        console.error('Album ID not found in params');
        alert('アルバムIDがURLに含まれていません。');
      } // if (albumIdFromParams) の終了
    }; // fetchAlbumData 関数の終了

    fetchAlbumData();
  }, [albumIdFromParams]); // useEffectの依存配列

  // currentPageIdが変更されたら、表示するオブジェクトを更新
  useEffect(() => {
    if (album && currentPageId) {
      const currentPage = album.pages.find(p => p.pageId === currentPageId);
      console.log(`%c[Effect] currentPageId or album changed. Page ID: ${currentPageId}`, 'color: cyan;');
      console.log('%c[Effect] Current page from album state:', 'color: cyan;', JSON.parse(JSON.stringify(currentPage)));
      const objectsToSet = currentPage?.objects || [];
      console.log('%c[Effect] Setting albumObjects from album state with these objects:', 'color: cyan; font-weight: bold;', JSON.parse(JSON.stringify(objectsToSet)));
      setAlbumObjects(objectsToSet);
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

  const handleItemDragStart = (e: React.DragEvent<HTMLDivElement>, item: Photo | Sticker, itemType: 'photo' | 'sticker') => {
    if (itemType === 'photo') {
      setDraggedItem({ type: 'photo', data: item as Photo });
    } else if (itemType === 'sticker') {
      setDraggedItem({ type: 'sticker', data: item as Sticker });
    }
    // item.id を item.photoId または item.stickerId に変更する必要があるが、
    // DraggableItem の data が Photo | Sticker なので、型ガードしてアクセスする
    let itemId: string;
    if (itemType === 'photo') {
        itemId = (item as Photo).photoId;
    } else {
        itemId = (item as Sticker).stickerId;
    }
    e.dataTransfer.setData('application/json', JSON.stringify({ type: itemType, id: itemId }));
    console.log(`Drag started: ${itemType}`, item);
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

    console.log(`%c[Drop] Type: ${draggedItem.type}`, 'color: blue; font-weight: bold;', 'Item:', draggedItem.data, 'Coords:', { positionX, positionY });

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
      const photoData = draggedItem.data as Photo;
      const img = new Image();
      img.src = photoData.url;
      try {
        await img.decode();
        itemWidth = img.naturalWidth > 0 ? img.naturalWidth : 100; // デフォルトサイズを設定
        itemHeight = img.naturalHeight > 0 ? img.naturalHeight : 100; // デフォルトサイズを設定
      } catch (e) {
        console.error("Error decoding photo for size, using default 100x100:", e);
        itemWidth = 100;
        itemHeight = 100;
      }

      newObjectDataPayload = {
        photoId: photoData.photoId, // photoData.id から photoData.photoId に変更
        cropInfo: {}, // 初期状態では空のcropInfo
        originalWidth: itemWidth, // 画像本来の幅
        originalHeight: itemHeight, // 画像本来の高さ
        url: photoData.url, // 表示用のURL
        name: photoData.name // 写真の名前
      };
    } else if (draggedItem.type === 'sticker') {
      objectType = 'sticker';
      const stickerData = draggedItem.data as Sticker;
      // ステッカーのサイズは固定またはStickerインターフェースから取得する想定
      // ここでは仮に固定値を使用
      itemWidth = 50;
      itemHeight = 50;

      newObjectDataPayload = {
        stickerId: stickerData.stickerId, // stickerData.id から stickerData.stickerId に変更
        name: stickerData.name,
        imageUrl: stickerData.imageUrl // ステッカーの画像URLを保存
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
      contentData: JSON.stringify(newObjectDataPayload), // contentData is stringified here
    };
    console.log('%c[Drop] Request to backend:', 'color: orange;', newObjectRequest);

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
        // Ensure contentData from response is parsed if it's a string (though API spec says it should be object)
        const parsedResponseObject = {
            ...responseObject,
            contentData: typeof responseObject.contentData === 'string'
                ? JSON.parse(responseObject.contentData)
                : responseObject.contentData,
        };
        console.log('%c[Drop] Object added successfully (from backend):', 'color: green;', parsedResponseObject);
        // Log the URL for photo or sticker from the backend response
        if (parsedResponseObject.type === 'photo') {
            console.log(`%c[Drop] Photo URL from backend: ${parsedResponseObject.contentData?.url}`, 'color: green;');
        } else if (parsedResponseObject.type === 'sticker') {
            console.log(`%c[Drop] Sticker imageUrl from backend: ${parsedResponseObject.contentData?.imageUrl}`, 'color: green;');
        }

        setAlbumObjects(prevObjects => {
          const newObjects = [...prevObjects, parsedResponseObject];
          console.log('%c[Drop] Updated albumObjects state (direct):', 'color: magenta; font-weight: bold;', JSON.parse(JSON.stringify(newObjects)));
          return newObjects;
        });
        if (album) {
          const updatedPages = album.pages.map(page => {
            if (page.pageId === currentPageId) {
              // Ensure the object added to album.pages also has parsed contentData
              return { ...page, objects: [...page.objects, parsedResponseObject] };
            }
            return page;
          });
          setAlbum(prevAlbum => { // Use functional update for prevAlbum
            const newAlbumState = { ...(prevAlbum || album), pages: updatedPages }; // Ensure prevAlbum is used if available
            console.log('%c[Drop] Updated album state (triggers effect):', 'color: darkorange; font-weight: bold;', JSON.parse(JSON.stringify(newAlbumState)));
            return newAlbumState;
          });
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

  const handlePhotoUploadDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // Optional: Add some visual feedback for drag over
    // e.currentTarget.classList.add('drag-over-active');
  };

  const handlePhotoUploadDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    // e.currentTarget.classList.remove('drag-over-active');

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      console.log('Files dropped for upload:', files);
      // TODO: Implement actual file upload logic here
      // For each file:
      // 1. Validate if it's an image
      // 2. Create FormData
      // 3. Call POST /api/photos
      // 4. Update photos state with the response

      const token = localStorage.getItem('token');
      if (!token) {
        alert('認証トークンがありません。再度ログインしてください。');
        return;
      }

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/photos', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              // 'Content-Type': 'multipart/form-data' is set automatically by browser for FormData
            },
            body: formData,
          });

          if (response.ok) {
            const newPhotoDataFromApi: any = await response.json(); // 一旦anyで受ける
            // APIレスポンスをPhotoインターフェースにマッピング
            const newPhoto: Photo = {
              photoId: newPhotoDataFromApi.photoId,
              url: newPhotoDataFromApi.filePath, // filePath を url にマッピング
              name: newPhotoDataFromApi.originalFilename, // originalFilename を name にマッピング
            };
            console.log('Photo uploaded successfully (mapped):', newPhoto);
            setPhotos(prevPhotos => [...prevPhotos, newPhoto]);
            // Optionally, update the album state if photos are directly tied to it
            // or re-fetch album data if the photo list is part of it.
          } else {
            const errorData = await response.json();
            console.error('Failed to upload photo:', response.status, errorData);
            alert(`写真のアップロードに失敗しました: ${file.name} - ${errorData.message || response.status}`);
          }
        } catch (error) {
          console.error('Error uploading photo:', file.name, error);
          alert(`写真のアップロード中にエラーが発生しました: ${file.name}`);
        }
      }
    }
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

  // Function to update object on the server
  const updateObjectOnServer = async (albumId: string, objectId: string, updatedFields: Partial<AlbumObject>) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('認証トークンがありません。');
      return null;
    }

    const payload = { ...updatedFields };
    // Ensure contentData is stringified if it's an object
    if (typeof payload.contentData === 'object' && payload.contentData !== null) {
      payload.contentData = JSON.stringify(payload.contentData);
    } else if (payload.contentData === undefined && updatedFields.hasOwnProperty('contentData')) {
      // If contentData was explicitly set to undefined (e.g. to remove it, though API might not support this)
      // or if it was an empty object that stringified to "{}" and you prefer to send null or not send it.
      // For now, if it's undefined in updatedFields, it won't be in payload unless explicitly handled.
      // If API expects contentData to always be present, ensure it's at least an empty string or "{}".
    }


    try {
      const response = await fetch(`/api/albums/${albumId}/objects/${objectId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload), // Send only the updated fields
      });
      if (response.ok) {
        const updatedObjectFromServer: AlbumObject = await response.json();
        console.log('Object updated successfully on server:', updatedObjectFromServer);
        return updatedObjectFromServer;
      } else {
        const errorData = await response.json();
        console.error('Failed to update object on server:', response.status, errorData);
        alert(`オブジェクトの更新に失敗しました: ${errorData.message || response.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error updating object on server:', error);
      alert('オブジェクトの更新中にサーバーエラーが発生しました。');
      return null;
    }
  };

  const handleObjectMouseDown = (e: React.MouseEvent<HTMLDivElement>, obj: AlbumObject) => {
    if (drawingMode || isResizingObject) return; // Do not select if drawing or already resizing

    setSelectedObject(obj);
    setIsDraggingObject(true);
    setObjectInitialState(obj); // Store initial state for potential revert or precise calculation
    const canvasRect = (e.currentTarget.closest('.album-edit-canvas') as HTMLDivElement)?.getBoundingClientRect();
    if (!canvasRect) return;

    const clickXInCanvas = e.clientX - canvasRect.left;
    const clickYInCanvas = e.clientY - canvasRect.top;

    setDragStartOffset({
      x: clickXInCanvas - obj.positionX,
      y: clickYInCanvas - obj.positionY,
    });
    e.stopPropagation(); // Prevent canvas mousedown from deselecting
    console.log('Object selected for dragging:', obj);
  };

  const handleObjectResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, handle: string) => {
    if (drawingMode || !selectedObject || isRotatingObject) return;
    e.stopPropagation(); // Prevent object drag
    setIsResizingObject(true);
    setResizeHandle(handle);
    setObjectInitialState(selectedObject); // Store initial state for resizing
    console.log(`Resize started on handle: ${handle} for object:`, selectedObject);
  };

  const handleObjectRotationMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode || !selectedObject || isResizingObject) return;
    e.stopPropagation(); // Prevent object drag or resize
    setIsRotatingObject(true);
    setObjectInitialState(selectedObject); // Store initial state for rotation

    const canvasRect = (e.currentTarget.closest('.album-edit-canvas') as HTMLDivElement)?.getBoundingClientRect();
    if (!canvasRect || !selectedObject) return;

    const centerX = selectedObject.positionX + selectedObject.width / 2;
    const centerY = selectedObject.positionY + selectedObject.height / 2;
    setObjectCenter({ x: centerX, y: centerY });

    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;

    const angleRad = Math.atan2(mouseY - centerY, mouseX - centerX);
    const angleDeg = angleRad * (180 / Math.PI);
    // rotationStartAngle is the angle of the mouse relative to the object's current rotation.
    // This means, if the object is already rotated by R, and mouse is at M degrees in canvas space,
    // the initial "grab" angle relative to the object's rotated frame is M - R.
    // When calculating new rotation, it will be currentMouseAngle - this_offset.
    setRotationStartAngle(angleDeg - selectedObject.rotation);


    console.log('Rotation started for object:', selectedObject, `Start angle offset: ${angleDeg - selectedObject.rotation}`);
  };


  const handleDrawingMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingMode || !currentPageId || isResizingObject || isRotatingObject || !pageRef.current) return; // canvasRef を pageRef に変更
    setIsDrawing(true);
    const pageEl = pageRef.current; // canvasEl を pageEl に変更
    const pageRect = pageEl.getBoundingClientRect(); // canvasRect を pageRect に変更
    // const computedStyle = window.getComputedStyle(pageEl); // pageRef には padding がないと想定されるためコメントアウト
    // const paddingLeft = parseFloat(computedStyle.paddingLeft);
    // const paddingTop = parseFloat(computedStyle.paddingTop);

    const x = e.clientX - pageRect.left; // canvasRect を pageRect に変更、padding計算は削除
    const y = e.clientY - pageRect.top;  // canvasRect を pageRect に変更、padding計算は削除
    setCurrentPath(`M ${x} ${y}`);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode && isDrawing && pageRef.current) { // canvasRef を pageRef に変更
      const pageEl = pageRef.current; // canvasEl を pageEl に変更
      const pageRect = pageEl.getBoundingClientRect(); // canvasRect を pageRect に変更
      // const computedStyle = window.getComputedStyle(pageEl); // pageRef には padding がないと想定されるためコメントアウト
      // const paddingLeft = parseFloat(computedStyle.paddingLeft);
      // const paddingTop = parseFloat(computedStyle.paddingTop);

      const x = e.clientX - pageRect.left; // canvasRect を pageRect に変更、padding計算は削除
      const y = e.clientY - pageRect.top;  // canvasRect を pageRect に変更、padding計算は削除
      setCurrentPath(prevPath => `${prevPath} L ${x} ${y}`);
      return;
    }

    if (isDraggingObject && selectedObject && dragStartOffset && album) {
      const canvasRect = e.currentTarget.getBoundingClientRect();
      const newX = e.clientX - canvasRect.left - dragStartOffset.x;
      const newY = e.clientY - canvasRect.top - dragStartOffset.y;

      setAlbumObjects(prevObjects =>
        prevObjects.map(obj =>
          obj.objectId === selectedObject.objectId
            ? { ...obj, positionX: newX, positionY: newY }
            : obj
        )
      );
    } else if (isResizingObject && selectedObject && resizeHandle && album && objectInitialState) {
        const canvasRect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        let { positionX, positionY, width, height } = objectInitialState; // Start from initial state for calculations
        const originalRight = objectInitialState.positionX + objectInitialState.width;
        const originalBottom = objectInitialState.positionY + objectInitialState.height;

        let newPositionX = positionX;
        let newPositionY = positionY;
        let newWidth = width;
        let newHeight = height;

        switch (resizeHandle) {
            case 'topLeft':
                newWidth = originalRight - mouseX;
                newHeight = originalBottom - mouseY;
                newPositionX = mouseX;
                newPositionY = mouseY;
                break;
            case 'topRight':
                newWidth = mouseX - positionX;
                newHeight = originalBottom - mouseY;
                newPositionY = mouseY;
                break;
            case 'bottomLeft':
                newWidth = originalRight - mouseX;
                newHeight = mouseY - positionY;
                newPositionX = mouseX;
                break;
            case 'bottomRight':
                newWidth = mouseX - positionX;
                newHeight = mouseY - positionY;
                break;
        }
        // Prevent negative width/height or ensure minimum size
        newWidth = Math.max(20, newWidth);
        newHeight = Math.max(20, newHeight);

        // Adjust position if width/height change affected it from left/top
        if (resizeHandle.includes('Left') && newWidth !== width) newPositionX = originalRight - newWidth;
        if (resizeHandle.includes('Top') && newHeight !== height) newPositionY = originalBottom - newHeight;


        setAlbumObjects(prevObjects =>
            prevObjects.map(obj =>
                obj.objectId === selectedObject.objectId
                    ? { ...obj, positionX: newPositionX, positionY: newPositionY, width: newWidth, height: newHeight }
                    : obj
            )
        );
    } else if (isRotatingObject && selectedObject && objectCenter && album) {
        const canvasRect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        const angleRad = Math.atan2(mouseY - objectCenter.y, mouseX - objectCenter.x);
        let newRotation = angleRad * (180 / Math.PI) - rotationStartAngle;
        newRotation = (newRotation % 360 + 360) % 360; // Normalize to 0-360

        setAlbumObjects(prevObjects =>
            prevObjects.map(obj =>
                obj.objectId === selectedObject.objectId
                    ? { ...obj, rotation: newRotation }
                    : obj
            )
        );
    }
  };

  const handleDrawingMouseUp = async () => {
    if (!isDrawing || !drawingMode || !album?.albumId || !currentPageId || !currentPath) {
      setIsDrawing(false); // Ensure isDrawing is reset even if we return early
      return;
    }
    setIsDrawing(false);

    const token = localStorage.getItem('token');
    if (!token) {
      alert('認証トークンがありません。再度ログインしてください。');
      return;
    }

    const points = currentPath.split(/[ML]/).filter(p => p.trim() !== '').map(p => {
      const [x, y] = p.trim().split(' ').map(Number);
      return { x, y };
    });

    if (points.length === 0) {
        setCurrentPath('');
        return;
    }

    const minX = Math.min(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxX = Math.max(...points.map(p => p.x));
    const maxY = Math.max(...points.map(p => p.y));

    const drawingWidth = Math.max(1, maxX - minX);
    const drawingHeight = Math.max(1, maxY - minY);

    const relativePath = points.map(p => ({ x: p.x - minX, y: p.y - minY }))
        .reduce((acc, p, i) => acc + (i === 0 ? 'M' : 'L') + ` ${p.x} ${p.y}`, '');

    const newDrawingObjectRequest = {
      pageId: currentPageId,
      type: 'drawing' as 'drawing',
      positionX: Math.round(minX),
      positionY: Math.round(minY),
      width: Math.round(drawingWidth),
      height: Math.round(drawingHeight),
      rotation: 0,
      zIndex: albumObjects.length,
      contentData: JSON.stringify({
        pathData: relativePath,
        color: penColor,
        thickness: penThickness,
        originalPath: currentPath,
      }),
    };

    try {
      const response = await fetch(`/api/albums/${album.albumId}/objects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDrawingObjectRequest),
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
        console.log('Drawing object added:', newObject);
      } else {
        const errorData = await response.json();
        alert(`描画オブジェクトの追加に失敗しました: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('Error adding drawing object:', error);
      alert('描画オブジェクトの追加中にエラーが発生しました。');
    }
    setCurrentPath('');
  };


  const handleCanvasMouseUp = async (e: React.MouseEvent<HTMLDivElement>) => {
    let updatedObjectFromServer: AlbumObject | null = null;
    let actionTaken = false;

    if (drawingMode && isDrawing) {
       await handleDrawingMouseUp();
       actionTaken = true;
    } else if (isDraggingObject && selectedObject && album && album.albumId && currentPageId) {
      actionTaken = true;
      const currentObjectState = albumObjects.find(obj => obj.objectId === selectedObject.objectId);
      if (currentObjectState) {
        const payloadForApi: Partial<AlbumObject> = { positionX: currentObjectState.positionX, positionY: currentObjectState.positionY };
        updatedObjectFromServer = await updateObjectOnServer(album.albumId, selectedObject.objectId, payloadForApi);
      } else {
        console.error("Consistency error: selected object not found during drag mouse up.");
      }
    } else if (isResizingObject && selectedObject && album && album.albumId && currentPageId) {
      actionTaken = true;
      const currentObjectState = albumObjects.find(obj => obj.objectId === selectedObject.objectId);
      if (currentObjectState) {
        const payloadForApi: Partial<AlbumObject> = {
            positionX: currentObjectState.positionX, positionY: currentObjectState.positionY,
            width: currentObjectState.width, height: currentObjectState.height,
        };
        updatedObjectFromServer = await updateObjectOnServer(album.albumId, selectedObject.objectId, payloadForApi);
      } else {
        console.error("Consistency error: selected object not found during resize mouse up.");
      }
    } else if (isRotatingObject && selectedObject && album && album.albumId && currentPageId) {
      actionTaken = true;
      const currentObjectState = albumObjects.find(obj => obj.objectId === selectedObject.objectId);
      if (currentObjectState) {
        const payloadForApi: Partial<AlbumObject> = { rotation: currentObjectState.rotation };
        updatedObjectFromServer = await updateObjectOnServer(album.albumId, selectedObject.objectId, payloadForApi);
      } else {
        console.error("Consistency error: selected object not found during rotation mouse up.");
      }
    }

    if (actionTaken && updatedObjectFromServer && album) {
        const finalUpdatedObjects = albumObjects.map(obj => obj.objectId === updatedObjectFromServer!.objectId ? updatedObjectFromServer! : obj);
        setAlbumObjects(finalUpdatedObjects);
        const updatedPages = album.pages.map(page => {
            if (page.pageId === currentPageId) return { ...page, objects: finalUpdatedObjects };
            return page;
        });
        setAlbum({ ...album, pages: updatedPages });
    } else if (actionTaken && !updatedObjectFromServer && objectInitialState && album) {
        // Revert to initial state if server update failed
        console.warn("Server update failed, reverting object to its initial state before the operation.");
        const revertedObjects = albumObjects.map(obj => obj.objectId === objectInitialState.objectId ? objectInitialState : obj);
        setAlbumObjects(revertedObjects);
    }


    setIsDraggingObject(false);
    setDragStartOffset(null);
    setIsResizingObject(false);
    setResizeHandle(null);
    setIsRotatingObject(false);
    setRotationStartAngle(0);
    setObjectCenter(null);
    setObjectInitialState(null); // Clear initial state after operation
    // Do not deselect object on mouse up, allow further interaction unless no action was taken
    // if (!actionTaken && e.target === e.currentTarget) { // If click was on canvas and no op, deselect
    //    setSelectedObject(null);
    // }
  };


  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drawingMode) {
      handleDrawingMouseDown(e);
      return;
    }
    // If click is on canvas background (not on an object that stops propagation, or a resize/rotate handle)
    if (e.target === e.currentTarget) {
      setSelectedObject(null);
      setIsTextEditing(false);
      setCurrentTextObjectId(null);
    }
  };

  const handleDeleteObject = async () => {
    if (!selectedObject || !album?.albumId || !currentPageId) {
      alert('削除するオブジェクトが選択されていません。');
      return;
    }
    const token = localStorage.getItem('token');
    if (!token) {
      alert('認証トークンがありません。');
      return;
    }

    if (!window.confirm(`オブジェクト「${selectedObject.objectId.substring(0,8)}...」を削除しますか？`)) {
        return;
    }

    try {
      const response = await fetch(`/api/albums/${album.albumId}/objects/${selectedObject.objectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('Object deleted successfully:', selectedObject.objectId);
        const updatedObjects = albumObjects.filter(obj => obj.objectId !== selectedObject.objectId);
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
        setSelectedObject(null); // Deselect after deletion
      } else {
        const errorData = await response.json();
        console.error('Failed to delete object:', response.status, errorData);
        alert(`オブジェクトの削除に失敗しました: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('Error deleting object:', error);
      alert('オブジェクトの削除中にエラーが発生しました。');
    }
  };


  const handleMouseLeaveCanvas = () => {
    if (drawingMode && isDrawing) {
      handleDrawingMouseUp(); // Treat as mouse up to save current path
    }
    // If dragging, resizing or rotating an object and mouse leaves canvas, complete the operation
    if (isDraggingObject || isResizingObject || isRotatingObject) {
        // Simulate mouse up to save the current state.
        // This is a simplified approach. A more robust solution might track mouse events on the document.
        // For now, we assume the user intends to finish the operation at the last known position.
        // We need a way to call handleCanvasMouseUp without an event, or refactor its logic.
        // Let's just reset the states to prevent sticking, server update will happen on next interaction or explicit save.
        // console.log("Mouse left canvas during active operation. Operation might be implicitly completed or cancelled.");
        // setIsDraggingObject(false);
        // setDragStartOffset(null);
        // setIsResizingObject(false);
        // setResizeHandle(null);
        // setIsRotatingObject(false);
        // setRotationStartAngle(0);
        // setObjectCenter(null);
        // setObjectInitialState(null);
        // To ensure data is saved, we might need to trigger a save here.
        // For now, let's rely on the existing mouseup logic which should eventually be triggered.
        // Or, if the user re-enters and continues, it's fine. If they drop outside, it's tricky.
    }
  };


  return (
    <div className="album-edit-container">
      {/* Header */}
      <header className="album-edit-header">
        <button onClick={() => navigate('/albums')} className="button back-button">← 戻る</button>
        <h1>{album?.title || 'アルバム編集'}</h1>
        <div className="page-selector">
          <span>ページ: </span>
          <select
            value={currentPageId || ''}
            onChange={(e) => {
                setCurrentPageId(e.target.value);
                setSelectedObject(null);
                setIsTextEditing(false);
            }}
            className="form-control"
            style={{ width: 'auto', display: 'inline-block', marginLeft: 'var(--spacing-xs)'}}
          >
            {album?.pages.sort((a,b) => a.pageNumber - b.pageNumber).map(page => (
              <option key={page.pageId} value={page.pageId}>
                {page.pageNumber}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Toolbar */}
      <div className="album-edit-toolbar">
        <div className="toolbar-group" id="file_operations">
            {/* TODO: Implement download and save functionality */}
            <button className="button" onClick={() => alert('ダウンロード機能は未実装です。')}>Download</button>
            <button className="button" onClick={() => alert('保存機能は未実装です。')}>Save</button>
            <button onClick={handleAddPage} className="button">ページ追加</button>
        </div>
        <div className="toolbar-group" id="image_operations">
            <button onClick={handleCropButtonClick} className="button" disabled={!selectedObject || selectedObject.type !== 'photo'}>写真切り取り</button>
        </div>
        <div className="toolbar-group" id="text_tools">
            <button onClick={handleAddTextObject} className="button">テキスト追加</button>
            <select value={currentTextStyle.font} onChange={(e) => handleTextStyleChange('font', e.target.value)} disabled={!isTextEditing || !selectedObject || selectedObject.type !== 'text'} className="form-control toolbar-font-select">
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Verdana">Verdana</option>
            <option value="Times New Roman">Times New Roman</option>
            </select>
            <input type="number" value={currentTextStyle.size} onChange={(e) => handleTextStyleChange('size', parseInt(e.target.value))} disabled={!isTextEditing || !selectedObject || selectedObject.type !== 'text'} className="form-control toolbar-font-size-input" />
            <input type="color" value={currentTextStyle.color} onChange={(e) => handleTextStyleChange('color', e.target.value)} disabled={!isTextEditing || !selectedObject || selectedObject.type !== 'text'} className="form-control toolbar-color-input"/>
            <button onClick={() => handleTextStyleChange('bold', !currentTextStyle.bold)} disabled={!isTextEditing || !selectedObject || selectedObject.type !== 'text'} className="button" style={{ fontWeight: currentTextStyle.bold ? 'bold' : 'normal' }}>B</button>
            {isTextEditing && <button onClick={handleTextEditComplete} className="button button-primary">テキスト保存</button>}
        </div>

        <div className="toolbar-group" id="drawing_tools">
            <button onClick={() => setDrawingMode(!drawingMode)} className={`button ${drawingMode ? 'button-primary' : ''}`}>
            {drawingMode ? 'ペン' : 'ペン'}
            </button>
            <select value={penColor} onChange={(e) => setPenColor(e.target.value)} disabled={!drawingMode} className="form-control toolbar-color-select">
              <option value="#000000">Black</option>
              <option value="#FF0000">Red</option>
              <option value="#FFA500">Orange</option>
              <option value="#008000">Green</option>
              <option value="#32CD32">Lime Green</option>
              <option value="#FFFF00">Yellow</option>
              <option value="#00BFFF">Cyan/Sky Blue</option>
              <option value="#0000FF">Blue</option>
              <option value="#800080">Purple</option>
            </select>
            <select value={penThickness} onChange={(e) => setPenThickness(Number(e.target.value))} disabled={!drawingMode} className="form-control toolbar-thickness-select">
            <option value="2">細</option>
            <option value="5">中</option>
            <option value="10">太</option>
            </select>
        </div>
        <div className="toolbar-group" id="selection_tool">
            <button onClick={() => setSelectedObject(null)} className="button" disabled={!selectedObject}>選択</button>
            {/* <button className="button">Select Object (TBD)</button> */}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="album-edit-main">
        {/* Canvas Area */}
        <div
          ref={canvasRef}
          className={`album-edit-canvas ${drawingMode && isDrawing ? 'drawing-active' : ''} ${isDraggingObject || isResizingObject || isRotatingObject ? 'grabbing' : ''}`}
          onDragOver={handleDragOver}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseDown={handleCanvasMouseDown}
          onMouseLeave={handleMouseLeaveCanvas}
        >
          <div ref={pageRef} className="album-page-representation" onDrop={handleDrop} onDragOver={handleDragOver} >
            {albumObjects.map(obj => {
              const style: React.CSSProperties = {
                left: `${obj.positionX}px`,
                top: `${obj.positionY}px`,
                width: `${obj.width}px`,
                height: `${obj.height}px`,
                transform: `rotate(${obj.rotation}deg)`,
                zIndex: obj.zIndex,
              };

            const renderContent = () => {
                const content = typeof obj.contentData === 'string'
                                ? JSON.parse(obj.contentData || '{}')
                                : (obj.contentData || {});
              switch (obj.type) {
                case 'photo':
                  const photoSrc = content.url || 'https://via.placeholder.com/100?text=No+Image';
                  const photoAlt = content.name || 'Album photo';
                  if (content.cropInfo && content.cropInfo.width && content.cropInfo.height) {
                    const { x, y, width: cropW, height: cropH } = content.cropInfo;
                    const scaleX = obj.width / cropW;
                    const scaleY = obj.height / cropH;
                    return (
                      <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                        <img
                          src={photoSrc}
                          alt={photoAlt}
                          style={{
                            position: 'absolute',
                            left: `-${x * scaleX}px`,
                            top: `-${y * scaleY}px`,
                            width: `${content.originalWidth * scaleX}px`,
                            height: `${content.originalHeight * scaleY}px`,
                            maxWidth: 'none',
                            maxHeight: 'none',
                            objectFit: 'none',
                          }}
                          draggable={false}
                        />
                      </div>
                    );
                  }
                  return (
                    <img
                      src={photoSrc}
                      alt={photoAlt}
                      draggable={false}
                    />
                  );
                case 'sticker':
                  return (
                    <img
                      src={content.imageUrl || 'https://via.placeholder.com/50?text=S'}
                      alt={content.name || 'Sticker'}
                      draggable={false}
                    />
                  );
                case 'text':
                    const textStyleFromContent: React.CSSProperties = {
                        fontFamily: content.font || 'Inter',
                        fontSize: `${content.size || 16}px`,
                        color: content.color || '#212529',
                        fontWeight: content.bold ? 'bold' : 'normal',
                    };
                    if (isTextEditing && currentTextObjectId === obj.objectId) {
                      return (
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={handleTextEditComplete}
                          autoFocus
                          style={{ ...textStyleFromContent, width: '100%', height: '100%', border: '1px dashed var(--primary-color)', outline: 'none', resize: 'none', boxSizing: 'border-box', padding: 'var(--spacing-xs)' }}
                        />
                      );
                    }
                    return <div style={textStyleFromContent} className="text-content-wrapper" onDoubleClick={() => handleTextObjectClick(obj)}>{content.text || 'テキスト'}</div>;

                case 'drawing':
                    const originalWidth = content.originalWidth || obj.width;
                    const originalHeight = content.originalHeight || obj.height;
                  return (
                    <svg className="drawing-svg" viewBox={`0 0 ${originalWidth} ${originalHeight}`}>
                      <path
                        d={content.pathData || ''}
                        stroke={content.color || '#000000'}
                        strokeWidth={content.thickness || 2}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  );
                default:
                  return null;
              }
            };

              return (
                <div
                  key={obj.objectId}
                  className={`album-object ${selectedObject?.objectId === obj.objectId ? 'selected' : ''}`}
                  style={style}
                  onMouseDown={(e) => handleObjectMouseDown(e, obj)}
                  onDoubleClick={obj.type === 'text' && !isTextEditing ? () => handleTextObjectClick(obj) : undefined}
                >
                  {renderContent()}
                  {selectedObject?.objectId === obj.objectId && !isTextEditing && (
                    <>
                      {['topLeft', 'topRight', 'bottomLeft', 'bottomRight'].map(handle => (
                        <div
                          key={handle}
                          className={`resize-handle ${handle}`}
                          onMouseDown={(e) => handleObjectResizeMouseDown(e, handle)}
                        />
                      ))}
                      <button
                        className="control-handle delete-object-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteObject();
                        }}
                        aria-label="Delete object"
                      />
                      <div
                        className="control-handle rotate-handle"
                        onMouseDown={handleObjectRotationMouseDown}
                        aria-label="Rotate object"
                      />
                       {selectedObject.type === 'photo' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCropButtonClick();
                          }}
                          className="button"
                          style={{ position: 'absolute', top: -35, left: -35, zIndex: 12, padding: 'var(--spacing-xs)', width: 'auto', height: 'auto', minWidth: 'auto' }}
                          aria-label="Crop photo"
                        >
                          Crop
                        </button>
                      )}
                    </>
                  )}
                  {selectedObject?.objectId === obj.objectId && cropMode === 'shape' && cropShape && obj.type === 'photo' && (
                    <div className="crop-overlay-shape" style={{
                      top: `${cropShape.y}px`,
                      left: `${cropShape.x}px`,
                      width: `${cropShape.width}px`,
                      height: `${cropShape.height}px`,
                    }}/>
                  )}
                </div>
              );
            })}
            {isDrawing && currentPath && (
              <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <path
                  d={currentPath}
                  stroke={penColor}
                  strokeWidth={penThickness}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          {cropMode && selectedObject && selectedObject.type === 'photo' && (
            <button onClick={handleConfirmCrop} className="button button-primary crop-confirm-button">
              切り取り確定
            </button>
          )}
        </div>

        <aside className="album-edit-sidebar">
          <div className="sidebar-tabs">
            <button
              className={activeTab === 'photos' ? 'active' : ''}
              onClick={() => handleTabChange('photos')}
            >
              写真
            </button>
            <button
              className={activeTab === 'stickers' ? 'active' : ''}
              onClick={() => handleTabChange('stickers')}
            >
              ステッカー
            </button>
          </div>
          <div
            className="sidebar-content"
            onDragOver={handlePhotoUploadDragOver}
            onDrop={activeTab === 'photos' ? handlePhotoUploadDrop : undefined}
          >
            {activeTab === 'photos' && (
              <div>
                <h4>写真リスト</h4>
                <p className="sidebar-upload-instruction">ここに写真をドラッグ＆ドロップしてアップロードできます。</p>
                <div className="sidebar-item-list">
                    {photos.map(photo => (
                    <div
                        key={photo.photoId}
                        className="sidebar-item"
                        draggable
                        onDragStart={(e) => handleItemDragStart(e, photo, 'photo')}
                        title={photo.name}
                    >
                        <img src={photo.url} alt={photo.name} />
                    </div>
                    ))}
                </div>
              </div>
            )}
            {activeTab === 'stickers' && (
              <div>
                <h4>ステッカーリスト</h4>
                <div className="sidebar-item-list">
                    {stickers.map(sticker => (
                    <div
                        key={sticker.stickerId}
                        className="sidebar-item"
                        draggable
                        onDragStart={(e) => handleItemDragStart(e, sticker, 'sticker')}
                        title={sticker.name}
                    >
                        <img src={sticker.imageUrl} alt={sticker.name} />
                    </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
};

export default AlbumEdit;