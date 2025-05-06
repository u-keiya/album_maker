import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
  Unique,
} from 'typeorm';
import { Album } from './Album';
import { AlbumObject } from './AlbumObject';

@Entity('album_pages')
@Unique(['album_id', 'page_number']) // 複合ユニーク制約
export class AlbumPage {
  @PrimaryGeneratedColumn('uuid')
  page_id: string;

  @Index() // 外部キーにはインデックスを作成
  @Column({ type: 'uniqueidentifier', nullable: false }) // UUID -> uniqueidentifier
  album_id: string;

  @Column({ type: 'int', nullable: false })
  page_number: number;

  @CreateDateColumn({ type: 'datetimeoffset' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetimeoffset' })
  updated_at: Date;

  // --- リレーション定義 ---
  @ManyToOne(() => Album, (album) => album.pages, { onDelete: 'CASCADE' }) // Albumとの多対一リレーション
  @JoinColumn({ name: 'album_id' })
  album: Album;

  @OneToMany(() => AlbumObject, (object) => object.page) // AlbumObjectとの一対多リレーション
  objects: AlbumObject[];
}