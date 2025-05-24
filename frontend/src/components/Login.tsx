import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // useNavigateをインポート
import './Login.css'; // CSSファイルをインポート

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // useNavigateフックを使用

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // APIエンドポイントを環境変数から取得するか、setupProxy.js経由で相対パスにする
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }), // リクエストボディ
      });

      if (!response.ok) {
        const errorData = await response.json();
        // 401 Unauthorizedの場合のメッセージを具体的にする
        if (response.status === 401) {
            throw new Error(errorData.message || 'ユーザー名またはパスワードが正しくありません。');
        }
        throw new Error(errorData.message || 'ログインに失敗しました。');
      }

      const data = await response.json();
      console.log('Login successful:', data); // 成功時のレスポンスをコンソールに出力
      localStorage.setItem('token', data.token); // トークンをlocalStorageに保存
      setUsername('');
      setPassword('');
      navigate('/albums'); // ログイン成功後にアルバム一覧へ遷移

    } catch (err: any) {
      setError(err.message || 'ログインに失敗しました。もう一度お試しください。');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    navigate('/register'); // /registerパスに遷移
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2 className="login-title">ログイン</h2>
        <div className="form-group">
          <label htmlFor="login-username" className="form-label">ユーザー名:</label>
          <input
            type="text"
            id="login-username" // IDをRegisterと区別
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="ユーザー名を入力"
          />
        </div>
        <div className="form-group">
          <label htmlFor="login-password" className="form-label">パスワード:</label>
          <input
            type="password"
            id="login-password" // IDをRegisterと区別
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="パスワードを入力"
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <div className="login-button-container">
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
          <button
            type="button"
            className="button button-secondary" // 汎用ボタンスタイルを適用
            onClick={handleRegisterClick}
            disabled={loading}
          >
            新規登録はこちら
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;