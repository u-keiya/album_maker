import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // react-router-domをインポート
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import AlbumList from './components/AlbumList'; // AlbumListをインポート
import AlbumEdit from './components/AlbumEdit'; // AlbumEditをインポート

function App() {
  return (
    <Router> {/* BrowserRouterでラップ */}
      <div className="App">
        <Routes> {/* Routesでルート定義をラップ */}
          <Route path="/login" element={<Login />} /> {/* /login パス */}
          <Route path="/register" element={<Register />} /> {/* /register パス */}
          <Route path="/albums" element={<AlbumList />} /> {/* /albums パスを追加 */}
          <Route path="/albums/:albumId" element={<AlbumEdit />} /> {/* /albums/:albumId パスを追加 */}
          <Route path="/" element={<Login />} /> {/* デフォルトパスはLoginを表示 */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
