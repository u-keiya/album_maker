import React from 'react';
import { useParams } from 'react-router-dom';

const AlbumEdit: React.FC = () => {
  const { albumId } = useParams<{ albumId: string }>();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold">アルバム編集画面</h1>
      <p>アルバムID: {albumId}</p>
      {/* TODO: Implement album editing functionality */}
    </div>
  );
};

export default AlbumEdit;