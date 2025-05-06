import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // useNavigateをインポート

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
      const response = await fetch('http://localhost:3000/auth/login', { // APIエンドポイント
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
            throw new Error(errorData.message || 'Incorrect username or password.');
        }
        throw new Error(errorData.message || 'Login failed');
      }

      const data = await response.json();
      console.log('Login successful:', data); // 成功時のレスポンスをコンソールに出力
      localStorage.setItem('token', data.token); // トークンをlocalStorageに保存
      setUsername('');
      setPassword('');
      navigate('/albums'); // ログイン成功後にアルバム一覧へ遷移

    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    navigate('/register'); // /registerパスに遷移
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="login-username">Username:</label>
          <input
            type="text"
            id="login-username" // IDをRegisterと区別
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="login-password">Password:</label>
          <input
            type="password"
            id="login-password" // IDをRegisterと区別
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <button
        type="button"
        style={{ marginTop: '10px' }}
        onClick={handleRegisterClick} // onClickイベントハンドラを追加
      >
        ユーザ登録はこちら
      </button>
    </div>
  );
};

export default Login;