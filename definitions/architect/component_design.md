# コンポーネント設計 (クラス図)

以下のクラス図は、「アルバムメーカー」アプリケーションの主要なコンポーネントとその関係性を示します。
`definitions/requirements/system_requirements.md`、`definitions/architect/system_architecture.md`、および `definitions/architect/ui_design.md` に基づいています。

```mermaid
classDiagram
    direction LR

    %% --- Class Definitions within Namespaces ---

    namespace Backend_API {
        class AuthService["AuthService <<SERVICE>>"]
        class UserService["UserService <<SERVICE>>"]
        class AlbumService["AlbumService <<SERVICE>>"]
        class PhotoService["PhotoService <<SERVICE>>"]
        class EditService["EditService <<SERVICE>>"]

        class UserRepository["UserRepository <<REPOSITORY>>"]
        class AlbumRepository["AlbumRepository <<REPOSITORY>>"]
        class AlbumPageRepository["AlbumPageRepository <<REPOSITORY>>"]
        class PhotoRepository["PhotoRepository <<REPOSITORY>>"]
        class AlbumObjectRepository["AlbumObjectRepository <<REPOSITORY>>"]

        class AuthController["AuthController <<CONTROLLER>>"] {
            +login()
            +register()
            +logout()
        }
        class UserController["UserController <<CONTROLLER>>"] {
            +updateUser()
            +deleteUser()
        }
        class AlbumController["AlbumController <<CONTROLLER>>"] {
            +getAlbums()
            +createAlbum()
            +getAlbum()
            +deleteAlbum()
            +downloadAlbum()
        }
        class PhotoController["PhotoController <<CONTROLLER>>"] {
            +uploadPhoto()
            +deletePhoto()
        }
        class EditController["EditController <<CONTROLLER>>"] {
            +addPage()
            +deletePage()
            +createObject()
            +getObjects()
            +updateObject()
            +deleteObject()
        }
    }

    namespace Database {
        class User["User <<ENTITY>>"] {
            +UUID userId PK
            +String username
            +String passwordHash
            +Timestamp createdAt
            +Timestamp updatedAt
        }
        class Album["Album <<ENTITY>>"] {
            +UUID albumId PK
            +UUID userId FK
            +String title
            +Timestamp createdAt
            +Timestamp updatedAt
        }
        class AlbumPage["AlbumPage <<ENTITY>>"] {
            +UUID pageId PK
            +UUID albumId FK
            +Integer pageNumber
            +Timestamp createdAt
            +Timestamp updatedAt
        }
        class Photo["Photo <<ENTITY>>"] {
            +UUID photoId PK
            +UUID userId FK
            +String filePath
            +String originalFilename
            +Timestamp uploadedAt
        }
        class AlbumObject["AlbumObject <<ENTITY>>"] {
            +UUID objectId PK
            +UUID pageId FK
            +String type
            +Integer positionX
            +Integer positionY
            +Integer width
            +Integer height
            +Float rotation
            +Integer zIndex
            +JSON contentData
            +Timestamp createdAt
            +Timestamp updatedAt
        }
    }

    namespace Frontend_Application {
        class LoginPage["LoginPage <<COMPONENT>>"]
        class RegisterPage["RegisterPage <<COMPONENT>>"]
        class AlbumListPage["AlbumListPage <<COMPONENT>>"]
        class Header["Header <<COMPONENT>>"]
        class Toolbar["Toolbar <<COMPONENT>>"]
        class Sidebar["Sidebar <<COMPONENT>>"] {
            +Photo[] photos
            +StickerAsset[] stickers
            --
            +displayAssets()
            +handleAssetDragStart()
        }
        class Card["Card <<COMPONENT>>"]
        class Button["Button <<COMPONENT>>"]
        class Grid["Grid <<COMPONENT>>"]
        class AssetTab["AssetTab <<COMPONENT>>"]
        class AlbumEditPage["AlbumEditPage <<COMPONENT>>"] {
            +Album album
            +AlbumPage currentPage
            --
            +displayPage()
            +addObject()
            +saveChanges()
        }
        class Canvas["Canvas <<COMPONENT>>"] {
            +AlbumObject[] objects
            --
            +renderObjects()
            +handleDragDrop()
            +handleObjectSelection()
            +handleDrawing()
            +handleObjectTransform()
        }
    }

    namespace External_Services {
         class Storage["Storage <<Azure Blob Storage>>"] {
             -- Methods --
             +uploadFile()
             +downloadFile()
             +deleteFile()
         }
    }

    %% --- Relationship Definitions (at top level) ---

    %% Backend API Internal Relationships
    AuthController --> AuthService
    UserController --> UserService
    AlbumController --> AlbumService
    PhotoController --> PhotoService
    EditController --> EditService
    AuthService --> UserRepository
    UserService --> UserRepository
    AlbumService --> AlbumRepository
    AlbumService --> AlbumPageRepository
    AlbumService --> AlbumObjectRepository
    PhotoService --> PhotoRepository
    EditService --> AlbumObjectRepository
    EditService --> AlbumPageRepository
    PhotoService --> Storage : uses %% Link from Backend API to External Service Class

    %% Database Internal Relationships
    User "1" -- "*" Album : has
    Album "1" -- "*" AlbumPage : contains
    AlbumPage "1" -- "*" AlbumObject : contains
    User "1" -- "*" Photo : owns

    %% Backend Repository to Database Entity Relationships
    UserRepository ..> User
    AlbumRepository ..> Album
    AlbumPageRepository ..> AlbumPage
    PhotoRepository ..> Photo
    AlbumObjectRepository ..> AlbumObject

    %% Frontend Internal Relationships (Composition)
    AlbumEditPage o-- Toolbar
    AlbumEditPage o-- Canvas
    AlbumEditPage o-- Sidebar
    AlbumListPage o-- Grid
    Grid o-- Card
    Sidebar o-- AssetTab

    %% Frontend to Backend API Relationships (API Calls)
    AlbumListPage ..> AlbumController : "API Call"
    AlbumEditPage ..> EditController : "API Call"
    AlbumEditPage ..> AlbumController : "API Call"
    AlbumEditPage ..> PhotoController : "API Call"
    LoginPage ..> AuthController : "API Call"
    RegisterPage ..> AuthController : "API Call"

    %% High-level Namespace/System Interactions (using representative class/namespace names)
    %% Note: Mermaid doesn't directly link namespaces, so link representative classes or omit if too abstract
    %% Example linking specific classes if needed:
    %% LoginPage --> AuthController : "HTTP Request"
    %% Alternatively, represent high-level flow with comments or separate diagram type

    %% Using comments for high-level flow as Mermaid doesn't link namespaces directly
    %% Frontend_Application -> Backend_API : "HTTP Request"
    %% Backend_API -> Database : "DB Query"
    %% Backend_API -> External_Services : "File Operation"

```

## コンポーネント概要

### バックエンド API
-   **Controllers:** フロントエンドからのリクエストを受け付け、対応するServiceを呼び出す。
-   **Services:** ビジネスロジックを担当。必要に応じて複数のRepositoryを操作する。
-   **Repositories:** データベースとのやり取り（CRUD操作）を抽象化する。

### データベース
-   **Entities:** システムで扱う主要なデータ構造（User, Album, Page, Photo, Object）。`AlbumObject` は `type` と `contentData` で写真、ステッカー、テキスト、描画などを表現する。

### フロントエンド アプリケーション (SPA)
-   **Pages:** 各画面（ログイン、一覧、編集など）に対応するコンポーネント。
-   **UI Components:** Toolbar, Canvas, Sidebar, Card など、再利用可能なUI部品。
-   **API Interaction:** バックエンドAPIを呼び出し、データの取得や更新を行う。

### 外部サービス
-   **Storage:** 写真などの静的ファイルを保存する（Azure Blob Storageを想定）。

このクラス図は、開発チームが各コンポーネントの責任範囲と相互作用を理解するための基礎となります。