import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import { AlbumPage } from './AlbumPage';
// content_dataの型定義
export interface CropInfo {
  shape: 'rectangle' | 'circle' | 'freehand';
  path?: string; // freehandの場合
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface PhotoContentData {
  photoId: string;
  cropInfo?: CropInfo;
}

export interface StickerContentData {
  stickerId: string;
}

export interface TextContentData {
  text: string;
  font?: string;
  size?: number;
  color?: string;
  bold?: boolean;
}

export interface DrawingContentData {
  pathData: string;
  color?: string;
  thickness?: number;
}

@Entity('album_objects')
@Check(`"type" IN ('photo', 'sticker', 'text', 'drawing')`) // CHECK制約
export class AlbumObject {
  @PrimaryGeneratedColumn('uuid')
  object_id: string;

  @Index() // 外部キーにはインデックスを作成
  @Column({ type: 'uniqueidentifier', nullable: false }) // UUID -> uniqueidentifier
  page_id: string;

  @Column({ type: 'nvarchar', length: 20, nullable: false }) // VARCHAR -> NVARCHAR
  type: 'photo' | 'sticker' | 'text' | 'drawing'; // 型をリテラル型に

  @Column({ type: 'int', nullable: false, default: 0 })
  position_x: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  position_y: number;

  @Column({ type: 'int', nullable: false })
  width: number;

  @Column({ type: 'int', nullable: false })
  height: number;

  @Column({ type: 'float', nullable: false, default: 0.0 })
  rotation: number;

  @Column({ type: 'int', nullable: false, default: 0 })
  z_index: number;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: false }) // JSONB -> NVARCHAR(MAX)
  content_data: string; // JSON文字列として格納

  @CreateDateColumn({ type: 'datetimeoffset' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetimeoffset' })
  updated_at: Date;

  // --- リレーション定義 ---
  @ManyToOne(() => AlbumPage, (page) => page.objects, { onDelete: 'CASCADE' }) // AlbumPageとの多対一リレーション
  @JoinColumn({ name: 'page_id' })
  page: AlbumPage;
}