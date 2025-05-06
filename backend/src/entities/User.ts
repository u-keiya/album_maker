import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany, // リレーションを追加する場合
} from 'typeorm';
import { Album } from './Album'; // リレーション先のエンティティ
import { Photo } from './Photo'; // リレーション先のエンティティ

@Entity('users') // テーブル名を指定
export class User {
  @PrimaryGeneratedColumn('uuid')
  user_id: string;

  @Index({ unique: true }) // 一意インデックス
  @Column({ type: 'nvarchar', length: 50, unique: true, nullable: false })
  username: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: false }) // TEXT -> NVARCHAR(MAX)
  password_hash: string;

  @CreateDateColumn({ type: 'datetimeoffset' }) // TIMESTAMP WITH TIME ZONE -> DATETIMEOFFSET
  created_at: Date;

  @UpdateDateColumn({ type: 'datetimeoffset' }) // TIMESTAMP WITH TIME ZONE -> DATETIMEOFFSET
  updated_at: Date;

  // --- リレーション定義 (必要に応じてコメント解除) ---
  @OneToMany(() => Album, (album) => album.user)
  albums: Album[];

  @OneToMany(() => Photo, (photo) => photo.user)
  photos: Photo[];
}