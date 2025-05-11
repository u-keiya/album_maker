# API 仕様書

このドキュメントは、「アルバムメーカー」アプリケーションのバックエンドAPI仕様を定義します。

## 1. 認証 (Authentication)

ベースパス: `/auth`

### 1.1. 新規ユーザー登録

*   **エンドポイント:** `POST /register`
*   **説明:** 新しいユーザーアカウントを作成します。
*   **認証:** 不要
*   **リクエストボディ:**
    ```json
    {
      "username": {
        "type": "string",
        "description": "ユーザー名 (一意である必要があります)",
        "minLength": 3,
        "maxLength": 50
      },
      "password": {
        "type": "string",
        "description": "パスワード",
        "minLength": 8
      }
    }
    ```
*   **レスポンス (成功):**
    *   **ステータスコード:** `201 Created`
    *   **ボディ:**
        ```json
        {
          "token": {
            "type": "string",
            "description": "認証用のJWTトークン"
          },
          "userId": {
            "type": "string",
            "format": "uuid",
            "description": "作成されたユーザーのID"
          },
          "username": {
            "type": "string",
            "description": "作成されたユーザーのユーザー名"
          }
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `400 Bad Request` (入力バリデーションエラー)
        ```json
        {
          "error": "InvalidInput",
          "message": "ユーザー名またはパスワードの形式が不正です。",
          "details": [ /* バリデーションエラーの詳細 */ ]
        }
        ```
    *   **ステータスコード:** `409 Conflict` (ユーザー名が既に存在)
        ```json
        {
          "error": "UsernameExists",
          "message": "指定されたユーザー名は既に使用されています。"
        }
        ```
    *   **ステータスコード:** `500 Internal Server Error` (サーバー内部エラー)
        ```json
        {
          "error": "ServerError",
          "message": "サーバー内部でエラーが発生しました。"
        }
        ```

### 1.2. ログイン

*   **エンドポイント:** `POST /login`
*   **説明:** 既存のユーザーアカウントでログインし、認証トークンを取得します。
*   **認証:** 不要
*   **リクエストボディ:**
    ```json
    {
      "username": {
        "type": "string",
        "description": "ユーザー名"
      },
      "password": {
        "type": "string",
        "description": "パスワード"
      }
    }
    ```
*   **レスポンス (成功):**
    *   **ステータスコード:** `200 OK`
    *   **ボディ:**
        ```json
        {
          "token": {
            "type": "string",
            "description": "認証用のJWTトークン"
          },
          "userId": {
            "type": "string",
            "format": "uuid",
            "description": "ログインしたユーザーのID"
          },
          "username": {
            "type": "string",
            "description": "ログインしたユーザーのユーザー名"
          }
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `400 Bad Request` (入力形式エラー)
        ```json
        {
          "error": "InvalidInput",
          "message": "ユーザー名またはパスワードが必要です。"
        }
        ```
    *   **ステータスコード:** `401 Unauthorized` (認証失敗)
        ```json
        {
          "error": "AuthenticationFailed",
          "message": "ユーザー名またはパスワードが正しくありません。"
        }
        ```
    *   **ステータスコード:** `500 Internal Server Error` (サーバー内部エラー)
        ```json
        {
          "error": "ServerError",
          "message": "サーバー内部でエラーが発生しました。"
        }
        ```

---

## 2. ユーザー管理 (User Management)

ベースパス: `/users`

### 2.1. パスワード変更

*   **エンドポイント:** `PUT /me/password`
*   **説明:** ログイン中のユーザーのパスワードを変更します。
*   **認証:** 必要 (JWTトークン)
*   **リクエストボディ:**
    ```json
    {
      "currentPassword": {
        "type": "string",
        "description": "現在のパスワード"
      },
      "newPassword": {
        "type": "string",
        "description": "新しいパスワード",
        "minLength": 8
      }
    }
    ```
*   **レスポンス (成功):**
    *   **ステータスコード:** `204 No Content`
*   **レスポンス (エラー):**
    *   **ステータスコード:** `400 Bad Request` (入力バリデーションエラー)
        ```json
        {
          "error": "InvalidInput",
          "message": "パスワードの形式が不正です。",
          "details": [ /* バリデーションエラーの詳細 */ ]
        }
        ```
    *   **ステータスコード:** `401 Unauthorized` (現在のパスワードが不一致)
        ```json
        {
          "error": "IncorrectPassword",
          "message": "現在のパスワードが正しくありません。"
        }
        ```
    *   **ステータスコード:** `401 Unauthorized` (認証トークン無効/期限切れ)
        ```json
        {
          "error": "Unauthorized",
          "message": "認証が必要です。"
        }
        ```
    *   **ステータスコード:** `500 Internal Server Error` (サーバー内部エラー)
        ```json
        {
          "error": "ServerError",
          "message": "サーバー内部でエラーが発生しました。"
        }
        ```

### 2.2. ユーザー削除 (退会)

*   **エンドポイント:** `DELETE /me`
*   **説明:** ログイン中のユーザーアカウントと関連データ（アルバム、写真など）を削除します。
*   **認証:** 必要 (JWTトークン)
*   **リクエストボディ:** なし
*   **レスポンス (成功):**
    *   **ステータスコード:** `204 No Content`
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized` (認証トークン無効/期限切れ)
        ```json
        {
          "error": "Unauthorized",
          "message": "認証が必要です。"
        }
        ```
    *   **ステータスコード:** `500 Internal Server Error` (サーバー内部エラー)
        ```json
        {
          "error": "ServerError",
          "message": "サーバー内部でエラーが発生しました。"
        }
        ```

---

## 3. アルバム管理 (Album Management)

ベースパス: `/albums`

### 3.1. アルバム一覧取得

*   **エンドポイント:** `GET /`
*   **説明:** ログイン中のユーザーが作成したアルバムの一覧を取得します。
*   **認証:** 必要 (JWTトークン)
*   **リクエストパラメータ:** なし
*   **レスポンス (成功):**
    *   **ステータスコード:** `200 OK`
    *   **ボディ:**
        ```json
        [
          {
            "albumId": "string (uuid)",
            "title": "string",
            "thumbnailUrl": "string (url, optional)", // カバー写真など
            "createdAt": "string (date-time)",
            "updatedAt": "string (date-time)"
          }
          // ... more albums
        ]
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `500 Internal Server Error`

### 3.2. 新規アルバム作成

*   **エンドポイント:** `POST /`
*   **説明:** 新しいアルバムを作成します。初期ページが1ページ作成されます。
*   **認証:** 必要 (JWTトークン)
*   **リクエストボディ:**
    ```json
    {
      "title": {
        "type": "string",
        "description": "アルバムのタイトル",
        "maxLength": 100,
        "default": "新しいアルバム"
      }
    }
    ```
*   **レスポンス (成功):**
    *   **ステータスコード:** `201 Created`
    *   **ボディ:** (作成されたアルバム情報)
        ```json
        {
          "albumId": "string (uuid)",
          "title": "string",
          "createdAt": "string (date-time)",
          "updatedAt": "string (date-time)",
          "pages": [ // 初期ページ情報
            {
              "pageId": "string (uuid)",
              "pageNumber": 1
            }
          ]
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `400 Bad Request` (タイトルが長すぎるなど)
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `500 Internal Server Error`

### 3.3. 特定アルバム取得

*   **エンドポイント:** `GET /{albumId}`
*   **説明:** 指定されたIDのアルバムの詳細情報（ページリスト、各ページのオブジェクトリストを含む）を取得します。
*   **認証:** 必要 (JWTトークン、自身のアルバムのみアクセス可)
*   **パスパラメータ:**
    *   `albumId` (string, uuid): 取得するアルバムのID
*   **レスポンス (成功):**
    *   **ステータスコード:** `200 OK`
    *   **ボディ:**
        ```json
        {
          "albumId": "string (uuid)",
          "title": "string",
          "createdAt": "string (date-time)",
          "updatedAt": "string (date-time)",
          "pages": [
            {
              "pageId": "string (uuid)",
              "pageNumber": "integer",
              "objects": [
                {
                  "objectId": "string (uuid)",
                  "type": "string ('photo', 'sticker', 'text', 'drawing')",
                  "positionX": "integer",
                  "positionY": "integer",
                  "width": "integer",
                  "height": "integer",
                  "rotation": "float",
                  "zIndex": "integer",
                  "contentData": {
                    // typeに応じたデータ構造 (例: photoId, textContent, etc.)
                  },
                  "createdAt": "string (date-time)",
                  "updatedAt": "string (date-time)"
                }
                // ... more objects on this page
              ]
            }
            // ... more pages
          ]
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden` (自身のアルバムではない)
    *   **ステータスコード:** `404 Not Found` (指定されたアルバムIDが存在しない)
    *   **ステータスコード:** `500 Internal Server Error`

### 3.4. アルバム削除

*   **エンドポイント:** `DELETE /{albumId}`
*   **説明:** 指定されたIDのアルバムと関連データ（ページ、オブジェクト）を削除します。
*   **認証:** 必要 (JWTトークン、自身のアルバムのみアクセス可)
*   **パスパラメータ:**
    *   `albumId` (string, uuid): 削除するアルバムのID
*   **レスポンス (成功):**
    *   **ステータスコード:** `204 No Content`
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found`
    *   **ステータスコード:** `500 Internal Server Error`

### 3.5. アルバムダウンロード

*   **エンドポイント:** `GET /{albumId}/download`
*   **説明:** 指定されたIDのアルバムをPDF形式でダウンロードします。
*   **認証:** 必要 (JWTトークン、自身のアルバムのみアクセス可)
*   **パスパラメータ:**
    *   `albumId` (string, uuid): ダウンロードするアルバムのID
*   **レスポンス (成功):**
    *   **ステータスコード:** `200 OK`
    *   **ヘッダー:**
        *   `Content-Type: application/pdf`
        *   `Content-Disposition: attachment; filename="album_{albumId}.pdf"`
    *   **ボディ:** PDFファイルのバイナリデータ
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found`
    *   **ステータスコード:** `500 Internal Server Error` (PDF生成エラー含む)

---

## 4. 写真管理 (Photo Management)

ベースパス: `/photos`

### 4.1. 写真アップロード

*   **エンドポイント:** `POST /`
*   **説明:** 新しい写真をアップロードします。
*   **認証:** 必要 (JWTトークン)
*   **リクエストボディ:** `multipart/form-data`
    *   `file`: アップロードする写真ファイル (画像形式: JPEG, PNG, GIF など)
*   **レスポンス (成功):**
    *   **ステータスコード:** `201 Created`
    *   **ボディ:** (アップロードされた写真の情報)
        ```json
        {
          "photoId": "string (uuid)",
          "filePath": "string (url)", // 保存先URL
          "originalFilename": "string",
          "uploadedAt": "string (date-time)"
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `400 Bad Request` (ファイル形式不正、サイズ超過など)
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `500 Internal Server Error` (アップロード処理エラー)

### 4.2. 写真削除

*   **エンドポイント:** `DELETE /{photoId}`
*   **説明:** 指定されたIDの写真を削除します。(注意: アルバムから参照されている場合の影響は要検討)
*   **認証:** 必要 (JWTトークン、自身の写真のみアクセス可)
*   **パスパラメータ:**
    *   `photoId` (string, uuid): 削除する写真のID
*   **レスポンス (成功):**
    *   **ステータスコード:** `204 No Content`
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found`
    *   **ステータスコード:** `500 Internal Server Error`

---

## 5. アルバム編集 (Album Editing)

ベースパス: `/albums/{albumId}`

### 5.1. ページ追加

*   **エンドポイント:** `POST /pages`
*   **説明:** 指定されたアルバムに新しいページを追加します。ページ番号は自動で割り当てられます。
*   **認証:** 必要 (JWTトークン、自身のアルバムのみアクセス可)
*   **パスパラメータ:**
    *   `albumId` (string, uuid): ページを追加するアルバムのID
*   **リクエストボディ:** なし (またはオプションで挿入位置などを指定)
*   **レスポンス (成功):**
    *   **ステータスコード:** `201 Created`
    *   **ボディ:** (作成されたページ情報)
        ```json
        {
          "pageId": "string (uuid)",
          "pageNumber": "integer" // 新しく割り当てられたページ番号
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found` (アルバムが存在しない)
    *   **ステータスコード:** `500 Internal Server Error`

### 5.2. ページ削除

*   **エンドポイント:** `DELETE /pages/{pageId}`
*   **説明:** 指定されたIDのページをアルバムから削除します。ページ番号の再割り当てが発生する可能性があります。
*   **認証:** 必要 (JWTトークン、自身のアルバムのみアクセス可)
*   **パスパラメータ:**
    *   `albumId` (string, uuid): 対象アルバムのID
    *   `pageId` (string, uuid): 削除するページのID
*   **レスポンス (成功):**
    *   **ステータスコード:** `204 No Content`
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found` (アルバムまたはページが存在しない)
    *   **ステータスコード:** `400 Bad Request` (最後のページは削除できないなど、制約によるエラー)
    *   **ステータスコード:** `500 Internal Server Error`

### 5.3. オブジェクト追加

*   **エンドポイント:** `POST /objects`
*   **説明:** 指定されたアルバムのページに新しいオブジェクト（写真、ステッカー、テキスト、描画）を追加します。
*   **認証:** 必要 (JWTトークン、自身のアルバムのみアクセス可)
*   **パスパラメータ:**
    *   `albumId` (string, uuid): 対象アルバムのID
*   **リクエストボディ:**
    ```json
    {
      "pageId": "string (uuid)", // オブジェクトを追加するページのID
      "type": "string ('photo', 'sticker', 'text', 'drawing')",
      "positionX": "integer",
      "positionY": "integer",
      "width": "integer",
      "height": "integer",
      "rotation": "float (default: 0)",
      "zIndex": "integer (default: 0)", // 重なり順
      "contentData": {
        // typeに応じたデータ (必須)
        // 例 (type='photo'): { "photoId": "string (uuid)", "cropInfo": { ... } }
        // 例 (type='sticker'): { "stickerId": "string" }
        // 例 (type='text'): { "text": "string", "font": "string", "size": "integer", "color": "string", "bold": "boolean" }
        // 例 (type='drawing'): { "pathData": "string (svg path)", "color": "string", "thickness": "integer" }
      }
    }
    ```
*   **レスポンス (成功):**
    *   **ステータスコード:** `201 Created`
    *   **ボディ:** (作成されたオブジェクト情報)
        ```json
        {
          "objectId": "string (uuid)",
          "pageId": "string (uuid)",
          "type": "string",
          "positionX": "integer",
          "positionY": "integer",
          "width": "integer",
          "height": "integer",
          "rotation": "float",
          "zIndex": "integer",
          "contentData": { ... },
          "createdAt": "string (date-time)",
          "updatedAt": "string (date-time)"
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `400 Bad Request` (入力バリデーションエラー)
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found` (アルバムまたはページが存在しない)
    *   **ステータスコード:** `500 Internal Server Error`

### 5.4. オブジェクト更新

*   **エンドポイント:** `PUT /objects/{objectId}`
*   **説明:** 指定されたIDのオブジェクトのプロパティ（位置、サイズ、回転、内容など）を更新します。
*   **認証:** 必要 (JWTトークン、自身のアルバムのみアクセス可)
*   **パスパラメータ:**
    *   `albumId` (string, uuid): 対象アルバムのID
    *   `objectId` (string, uuid): 更新するオブジェクトのID
*   **リクエストボディ:** (更新したいプロパティのみを含む)
    ```json
    {
      "positionX": "integer (optional)",
      "positionY": "integer (optional)",
      "width": "integer (optional)",
      "height": "integer (optional)",
      "rotation": "float (optional)",
      "zIndex": "integer (optional)",
      "contentData": { /* typeに応じた更新データ (optional) */ }
    }
    ```
*   **レスポンス (成功):**
    *   **ステータスコード:** `200 OK`
    *   **ボディ:** (更新後のオブジェクト情報)
        ```json
        {
          "objectId": "string (uuid)",
          "pageId": "string (uuid)",
          "type": "string",
          "positionX": "integer",
          "positionY": "integer",
          "width": "integer",
          "height": "integer",
          "rotation": "float",
          "zIndex": "integer",
          "contentData": { ... },
          "createdAt": "string (date-time)",
          "updatedAt": "string (date-time)" // 更新された日時
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `400 Bad Request` (入力バリデーションエラー)
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found` (アルバムまたはオブジェクトが存在しない)
    *   **ステータスコード:** `500 Internal Server Error`

### 5.5. オブジェクト削除

*   **エンドポイント:** `DELETE /objects/{objectId}`
*   **説明:** 指定されたIDのオブジェクトをページから削除します。
*   **認証:** 必要 (JWTトークン、自身のアルバムのみアクセス可)
*   **パスパラメータ:**
    *   `albumId` (string, uuid): 対象アルバムのID
    *   `objectId` (string, uuid): 削除するオブジェクトのID
*   **レスポンス (成功):**
    *   **ステータスコード:** `204 No Content`
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found` (アルバムまたはオブジェクトが存在しない)
    *   **ステータスコード:** `500 Internal Server Error`

---

## 6. ステッカー管理 (Sticker Management)

ベースパス: `/stickers`

### 6.1. ステッカー一覧取得

*   **エンドポイント:** `GET /`
*   **説明:** 登録されているステッカーの一覧を取得します。
*   **認証:** 必要 (JWTトークン - 一般ユーザーも閲覧可能)
*   **リクエストパラメータ:** なし
*   **レスポンス (成功):**
    *   **ステータスコード:** `200 OK`
    *   **ボディ:**
        ```json
        [
          {
            "stickerId": "string (uuid)",
            "name": "string",
            "imageUrl": "string (url)",
            "createdAt": "string (date-time)",
            "updatedAt": "string (date-time)"
          }
          // ... more stickers
        ]
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `500 Internal Server Error`

### 6.2. 特定ステッカー取得

*   **エンドポイント:** `GET /{stickerId}`
*   **説明:** 指定されたIDのステッカー情報を取得します。
*   **認証:** 必要 (JWTトークン - 一般ユーザーも閲覧可能)
*   **パスパラメータ:**
    *   `stickerId` (string, uuid): 取得するステッカーのID
*   **レスポンス (成功):**
    *   **ステータスコード:** `200 OK`
    *   **ボディ:**
        ```json
        {
          "stickerId": "string (uuid)",
          "name": "string",
          "imageUrl": "string (url)",
          "createdAt": "string (date-time)",
          "updatedAt": "string (date-time)"
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `404 Not Found` (指定されたステッカーIDが存在しない)
    *   **ステータスコード:** `500 Internal Server Error`

### 6.3. 新規ステッカー登録 (管理者向け)

*   **エンドポイント:** `POST /`
*   **説明:** 新しいステッカーを登録します。Azure Blob Storageへのアップロードは別途行われている前提とし、ここではメタデータを登録します。
*   **認証:** 必要 (JWTトークン - 管理者権限が必要)
*   **リクエストボディ:**
    ```json
    {
      "name": {
        "type": "string",
        "description": "ステッカー名",
        "maxLength": 100
      },
      "imageUrl": {
        "type": "string",
        "format": "url",
        "description": "ステッカー画像のURL (Azure Blob StorageのURL)"
      }
    }
    ```
*   **レスポンス (成功):**
    *   **ステータスコード:** `201 Created`
    *   **ボディ:** (作成されたステッカー情報)
        ```json
        {
          "stickerId": "string (uuid)",
          "name": "string",
          "imageUrl": "string (url)",
          "createdAt": "string (date-time)",
          "updatedAt": "string (date-time)"
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `400 Bad Request` (入力バリデーションエラー)
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden` (管理者権限がない)
    *   **ステータスコード:** `500 Internal Server Error`

### 6.4. ステッカー情報更新 (管理者向け)

*   **エンドポイント:** `PUT /{stickerId}`
*   **説明:** 指定されたIDのステッカー情報を更新します。
*   **認証:** 必要 (JWTトークン - 管理者権限が必要)
*   **パスパラメータ:**
    *   `stickerId` (string, uuid): 更新するステッカーのID
*   **リクエストボディ:** (更新したいプロパティのみを含む)
    ```json
    {
      "name": {
        "type": "string",
        "description": "ステッカー名 (optional)",
        "maxLength": 100
      },
      "imageUrl": {
        "type": "string",
        "format": "url",
        "description": "ステッカー画像のURL (optional)"
      }
    }
    ```
*   **レスポンス (成功):**
    *   **ステータスコード:** `200 OK`
    *   **ボディ:** (更新後のステッカー情報)
        ```json
        {
          "stickerId": "string (uuid)",
          "name": "string",
          "imageUrl": "string (url)",
          "createdAt": "string (date-time)",
          "updatedAt": "string (date-time)" // 更新された日時
        }
        ```
*   **レスポンス (エラー):**
    *   **ステータスコード:** `400 Bad Request` (入力バリデーションエラー)
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found` (指定されたステッカーIDが存在しない)
    *   **ステータスコード:** `500 Internal Server Error`

### 6.5. ステッカー削除 (管理者向け)

*   **エンドポイント:** `DELETE /{stickerId}`
*   **説明:** 指定されたIDのステッカー情報を削除します。Azure Blob Storage上の実ファイルは別途削除が必要です。
*   **認証:** 必要 (JWTトークン - 管理者権限が必要)
*   **パスパラメータ:**
    *   `stickerId` (string, uuid): 削除するステッカーのID
*   **レスポンス (成功):**
    *   **ステータスコード:** `204 No Content`
*   **レスポンス (エラー):**
    *   **ステータスコード:** `401 Unauthorized`
    *   **ステータスコード:** `403 Forbidden`
    *   **ステータスコード:** `404 Not Found`
    *   **ステータスコード:** `500 Internal Server Error`

---