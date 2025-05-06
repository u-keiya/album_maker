import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // useNavigateをインポート

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
      const response = await fetch('http://localhost:3000/auth/register', { // APIエンドポイント
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }), // リクエストボディ
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      const data = await response.json();
      console.log('Registration successful:', data); // 成功時のレスポンスをコンソールに出力
      // TODO: トークンを保存し、ログイン状態に遷移する処理を追加
      alert('Registration successful! Redirecting to login...'); // 仮の成功通知
      setUsername('');
      setPassword('');
      navigate('/login'); // 登録成功後、ログインページへ遷移

    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginClick = () => {
    navigate('/login'); // /loginパスに遷移
  };

  return (
    <div>
      <h2>User Registration</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={50}
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>
      <button
        type="button"
        style={{ marginTop: '10px' }}
        onClick={handleLoginClick} // onClickイベントハンドラを追加
      >
        ログインはこちら
      </button>
    </div>
  );
};

export default Register;