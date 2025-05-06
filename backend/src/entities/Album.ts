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
} from 'typeorm';
import { User } from './User';
import { AlbumPage } from './AlbumPage';

@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn('uuid')
  album_id: string;

  @Index() // 外部キーにはインデックスを作成
  @Column({ type: 'uniqueidentifier', nullable: false }) // UUID -> uniqueidentifier
  user_id: string;

  @Column({ type: 'nvarchar', length: 100, nullable: false, default: '新しいアルバム' }) // VARCHAR -> NVARCHAR
  title: string;

  @CreateDateColumn({ type: 'datetimeoffset' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetimeoffset' })
  updated_at: Date;

  // --- リレーション定義 ---
  @ManyToOne(() => User, (user) => user.albums, { onDelete: 'CASCADE' }) // Userとの多対一リレーション
  @JoinColumn({ name: 'user_id' }) // 結合カラム指定
  user: User;

  @OneToMany(() => AlbumPage, (page) => page.album) // AlbumPageとの一対多リレーション
  pages: AlbumPage[];
}