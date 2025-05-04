# シーケンス図

このドキュメントでは、主要なユースケースにおけるコンポーネント間のインタラクションをシーケンス図で示します。

## 1. ログイン処理

```mermaid
sequenceDiagram
    actor User
    participant LoginPage
    participant AuthController
    participant AuthService
    participant UserRepository
    participant Database

    User->>LoginPage: ユーザIDとパスワードを入力し、ログインボタンを押下
    LoginPage->>AuthController: POST /auth/login (userID, password)
    AuthController->>AuthService: login(userID, password)
    AuthService->>UserRepository: findUserByUsername(userID)
    UserRepository->>Database: SELECT * FROM users WHERE username = ?
    Database-->>UserRepository: User Data (with password hash)
    UserRepository-->>AuthService: User Data
    AuthService->>AuthService: パスワード検証 (password, hash)
    alt 認証成功
        AuthService-->>AuthController: 認証成功 (e.g., JWT Token)
        AuthController-->>LoginPage: 200 OK (JWT Token)
        LoginPage->>User: アルバム一覧画面へ遷移
    else 認証失敗
        AuthService-->>AuthController: 認証失敗エラー
        AuthController-->>LoginPage: 401 Unauthorized
        LoginPage->>User: エラーメッセージ表示
    end
```

## 2. 新規ユーザー登録

```mermaid
sequenceDiagram
    actor User
    participant RegisterPage
    participant AuthController
    participant AuthService
    participant UserRepository
    participant Database

    User->>RegisterPage: ユーザIDとパスワード(確認含む)を入力し、登録ボタンを押下
    RegisterPage->>AuthController: POST /auth/register (userID, password)
    AuthController->>AuthService: register(userID, password)
    AuthService->>UserRepository: findUserByUsername(userID)
    UserRepository->>Database: SELECT 1 FROM users WHERE username = ?
    Database-->>UserRepository: null (ユーザーが存在しない)
    UserRepository-->>AuthService: null
    AuthService->>AuthService: パスワードハッシュ化
    AuthService->>UserRepository: createUser(userID, hashedPassword)
    UserRepository->>Database: INSERT INTO users (...) VALUES (...)
    Database-->>UserRepository: Success
    UserRepository-->>AuthService: New User Data
    AuthService-->>AuthController: 登録成功 (e.g., JWT Token)
    AuthController-->>RegisterPage: 201 Created (JWT Token)
    RegisterPage->>User: アルバム一覧画面へ遷移
```

## 3. アルバム一覧取得

```mermaid
sequenceDiagram
    participant AlbumListPage
    participant AlbumController
    participant AlbumService
    participant AlbumRepository
    participant Database

    AlbumListPage->>AlbumController: GET /albums
    AlbumController->>AlbumService: getAlbums(userId)
    AlbumService->>AlbumRepository: findAlbumsByUserId(userId)
    AlbumRepository->>Database: SELECT * FROM albums WHERE user_id = ?
    Database-->>AlbumRepository: Album List Data
    AlbumRepository-->>AlbumService: Album List
    AlbumService-->>AlbumController: Album List
    AlbumController-->>AlbumListPage: 200 OK (Album List)
    AlbumListPage->>AlbumListPage: アルバム一覧を表示
```

## 4. 新規アルバム作成

```mermaid
sequenceDiagram
    participant AlbumListPage
    participant AlbumController
    participant AlbumService
    participant AlbumRepository
    participant AlbumPageRepository
    participant Database

    AlbumListPage->>AlbumController: POST /albums (title: "New Album")
    AlbumController->>AlbumService: createAlbum(userId, title)
    AlbumService->>AlbumRepository: createAlbum(userId, title)
    AlbumRepository->>Database: INSERT INTO albums (...) VALUES (...)
    Database-->>AlbumRepository: New Album Data (with albumId)
    AlbumRepository-->>AlbumService: New Album Data
    AlbumService->>AlbumPageRepository: createPage(albumId, pageNumber: 1)
    AlbumPageRepository->>Database: INSERT INTO album_pages (...) VALUES (...)
    Database-->>AlbumPageRepository: New Page Data
    AlbumPageRepository-->>AlbumService: New Page Data
    AlbumService-->>AlbumController: New Album Data (with initial page)
    AlbumController-->>AlbumListPage: 201 Created (New Album Data)
    AlbumListPage->>AlbumListPage: アルバム編集画面へ遷移 (or リスト更新)
```

## 5. 写真アップロード

```mermaid
sequenceDiagram
    participant Sidebar
    participant PhotoController
    participant PhotoService
    participant PhotoRepository
    participant Storage as External Service
    participant Database

    Sidebar->>PhotoController: POST /photos (file data)
    PhotoController->>PhotoService: uploadPhoto(userId, file)
    PhotoService->>Storage: uploadFile(file)
    Storage-->>PhotoService: File Path (e.g., blob URL)
    PhotoService->>PhotoRepository: createPhoto(userId, filePath, originalFilename)
    PhotoRepository->>Database: INSERT INTO photos (...) VALUES (...)
    Database-->>PhotoRepository: New Photo Data
    PhotoRepository-->>PhotoService: New Photo Data
    PhotoService-->>PhotoController: New Photo Data
    PhotoController-->>Sidebar: 201 Created (New Photo Data)
    Sidebar->>Sidebar: アップロードされた写真をリストに追加
```

## 6. アルバムページへのオブジェクト追加 (写真)

```mermaid
sequenceDiagram
    participant Canvas
    participant EditController
    participant EditService
    participant AlbumObjectRepository
    participant Database

    Canvas->>EditController: POST /albums/{albumId}/objects (pageId, type: 'photo', photoId, position, size, etc.)
    EditController->>EditService: createObject(pageId, objectData)
    EditService->>AlbumObjectRepository: createObject(pageId, objectData)
    AlbumObjectRepository->>Database: INSERT INTO album_objects (...) VALUES (...)
    Database-->>AlbumObjectRepository: New Object Data (with objectId)
    AlbumObjectRepository-->>EditService: New Object Data
    EditService-->>EditController: New Object Data
    EditController-->>Canvas: 201 Created (New Object Data)
    Canvas->>Canvas: 新しいオブジェクトをCanvasに描画
```

## 7. アルバムページ上のオブジェクト更新 (移動)

```mermaid
sequenceDiagram
    participant Canvas
    participant EditController
    participant EditService
    participant AlbumObjectRepository
    participant Database

    Canvas->>EditController: PUT /albums/{albumId}/objects/{objectId} (updated positionX, positionY)
    EditController->>EditService: updateObject(objectId, updateData)
    EditService->>AlbumObjectRepository: updateObject(objectId, updateData)
    AlbumObjectRepository->>Database: UPDATE album_objects SET position_x = ?, position_y = ? WHERE object_id = ?
    Database-->>AlbumObjectRepository: Success
    AlbumObjectRepository-->>EditService: Updated Object Data
    EditService-->>EditController: Updated Object Data
    EditController-->>Canvas: 200 OK (Updated Object Data)
    Canvas->>Canvas: オブジェクトの位置を更新して再描画
```

## 8. アルバムページからのオブジェクト削除

```mermaid
sequenceDiagram
    participant Canvas
    participant EditController
    participant EditService
    participant AlbumObjectRepository
    participant Database

    Canvas->>EditController: DELETE /albums/{albumId}/objects/{objectId}
    EditController->>EditService: deleteObject(objectId)
    EditService->>AlbumObjectRepository: deleteObject(objectId)
    AlbumObjectRepository->>Database: DELETE FROM album_objects WHERE object_id = ?
    Database-->>AlbumObjectRepository: Success
    AlbumObjectRepository-->>EditService: Success
    EditService-->>EditController: Success
    EditController-->>Canvas: 204 No Content
    Canvas->>Canvas: オブジェクトをCanvasから削除
```

## 9. アルバムダウンロード

```mermaid
sequenceDiagram
    participant Toolbar
    participant AlbumController
    participant AlbumService
    participant AlbumRepository
    participant AlbumPageRepository
    participant AlbumObjectRepository
    participant Database

    Toolbar->>AlbumController: GET /albums/{albumId}/download
    AlbumController->>AlbumService: getAlbumDataForDownload(albumId)
    AlbumService->>AlbumRepository: findAlbumById(albumId)
    AlbumRepository->>Database: SELECT * FROM albums WHERE album_id = ?
    Database-->>AlbumRepository: Album Data
    AlbumRepository-->>AlbumService: Album Data
    AlbumService->>AlbumPageRepository: findPagesByAlbumId(albumId)
    AlbumPageRepository->>Database: SELECT * FROM album_pages WHERE album_id = ? ORDER BY page_number
    Database-->>AlbumPageRepository: Page List Data
    AlbumPageRepository-->>AlbumService: Page List
    loop For Each Page
        AlbumService->>AlbumObjectRepository: findObjectsByPageId(pageId)
        AlbumObjectRepository->>Database: SELECT * FROM album_objects WHERE page_id = ?
        Database-->>AlbumObjectRepository: Object List Data for Page
        AlbumObjectRepository-->>AlbumService: Object List
    end
    AlbumService->>AlbumService: アルバムデータからPDFを生成 (詳細省略)
    AlbumService-->>AlbumController: PDF Data
    AlbumController-->>Toolbar: 200 OK (PDF File Stream)
    Toolbar->>Toolbar: ファイルダウンロードを開始