import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // useNavigateをインポート
import './Register.css'; // CSSファイルをインポート

const Register: React.FC = () => {
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }), // リクエストボディ
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'ユーザー登録に失敗しました。');
      }

      const data = await response.json();
      console.log('Registration successful:', data); // 成功時のレスポンスをコンソールに出力
      // 登録成功後、自動でログインさせるか、ログインページにリダイレクトするかは要件による
      // ここではログインページへ遷移し、ユーザーに再度ログインを促す
      alert('ユーザー登録が完了しました。ログインページに移動します。');
      setUsername('');
      setPassword('');
      navigate('/login'); // 登録成功後、ログインページへ遷移

    } catch (err: any) {
      setError(err.message || 'ユーザー登録に失敗しました。もう一度お試しください。');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    navigate('/login'); // /loginパスに遷移
  };

  return (
    <div className="register-container">
      <form onSubmit={handleSubmit} className="register-form">
        <h2 className="register-title">ユーザー登録</h2>
        <div className="form-group">
          <label htmlFor="register-username" className="form-label">ユーザー名:</label>
          <input
            type="text"
            id="register-username" // IDをLoginと区別
            className="form-control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={50}
            placeholder="3文字以上50文字以内"
          />
        </div>
        <div className="form-group">
          <label htmlFor="register-password" className="form-label">パスワード:</label>
          <input
            type="password"
            id="register-password" // IDをLoginと区別
            className="form-control"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="8文字以上"
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <div className="register-button-container">
          <button type="submit" className="button button-primary" disabled={loading}>
            {loading ? '登録中...' : '登録する'}
          </button>
          <button
            type="button"
            className="button button-secondary"
            onClick={handleLoginClick}
            disabled={loading}
          >
            ログインはこちら
          </button>
        </div>
      </form>
    </div>
  );
};

export default Register;