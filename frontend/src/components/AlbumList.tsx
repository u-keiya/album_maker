import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

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
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">アルバム一覧</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        >
          ログアウト
        </button>
      </header>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">マイアルバム</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Add New Album Card */}
        <button
          type="button"
          className="border rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg bg-green-500 hover:bg-green-700 text-white font-bold"
          onClick={handleCreateAlbum}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>新規作成</span>
        </button>

        {/* Album Items */}
        {albums.map((album) => (
          <div key={album.albumId} className="border rounded-lg p-4 hover:shadow-lg cursor-pointer" onClick={() => navigate(`/albums/${album.albumId}`)}>
            <div className="w-full h-32 bg-gray-200 mb-2 rounded flex items-center justify-center">
              {/* TODO: Replace with actual thumbnail if available */}
              <span className="text-gray-500">{album.thumbnailUrl ? <img src={album.thumbnailUrl} alt={album.title} className="object-cover w-full h-full rounded"/> : 'サムネイルなし'}</span>
            </div>
            <h3 className="font-semibold text-lg mb-1">{album.title}</h3>
            <p className="text-sm text-gray-500">作成日: {new Date(album.createdAt).toLocaleDateString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlbumList;