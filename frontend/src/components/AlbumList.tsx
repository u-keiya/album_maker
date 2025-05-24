import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './AlbumList.css'; // CSSファイルをインポート

interface Album {
  albumId: string; // id から albumId に変更し、型をstringに修正
  title: string;
  createdAt: string;
  thumbnailUrl?: string; // Optional: If you have thumbnails
}

const AlbumList: React.FC = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        // TODO: Get token from storage
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }
        // Use relative path with proxy setup
        const response = await axios.get<Album[]>('/api/albums', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAlbums(response.data);
      } catch (err) {
        setError('Failed to fetch albums.');
        console.error(err);
      }
    };

    fetchAlbums();
  }, [navigate]);

  const handleLogout = () => {
    // TODO: Implement proper logout
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCreateAlbum = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      // API仕様書に基づき、デフォルトタイトルでアルバム作成APIを呼び出す
      const response = await axios.post<{ albumId: string, title: string, createdAt: string, updatedAt: string, pages: { pageId: string, pageNumber: number }[] }>(
        '/api/albums',
        { title: '新しいアルバム' }, // デフォルトタイトル
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      // 成功したら、新しく作成されたアルバムのページに遷移する
      // APIレスポンスから albumId を取得
      const newAlbumId = response.data.albumId;
      // TODO: /albums/:albumId のルートを App.tsx に追加する必要がある
      navigate(`/albums/${newAlbumId}`);
    } catch (err) {
      setError('アルバムの作成に失敗しました。');
      console.error(err);
    }
  };

  if (error) {
    return <div className="container error-message">Error: {error}</div>; // エラー表示にもスタイルを適用
  }

  return (
    <div className="album-list-container">
      <header className="album-list-header">
        <h1 className="album-list-title">アルバム一覧</h1>
        <button
          onClick={handleLogout}
          className="button button-secondary" // 汎用ボタンスタイルを適用
        >
          ログアウト
        </button>
      </header>

      <div className="section-title-container"> {/* 必要に応じてセクションタイトル用のコンテナを追加 */}
        <h2 className="section-title">マイアルバム</h2>
      </div>

      <div className="album-grid">
        {/* Add New Album Card */}
        <button
          type="button"
          className="album-card-new" // 新しいスタイルを適用
          onClick={handleCreateAlbum}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="album-card-new-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>新規作成</span>
        </button>

        {/* Album Items */}
        {albums.map((album) => (
          <div key={album.albumId} className="album-card" onClick={() => navigate(`/albums/${album.albumId}`)}>
            <div className="album-thumbnail">
              {album.thumbnailUrl ? (
                <img src={album.thumbnailUrl} alt={album.title} />
              ) : (
                <span className="album-thumbnail-placeholder">サムネイルなし</span>
              )}
            </div>
            <h3 className="album-card-title">{album.title}</h3>
            <p className="album-card-date">作成日: {new Date(album.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlbumList;