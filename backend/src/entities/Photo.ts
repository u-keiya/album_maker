import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User';

@Entity('photos')
export class Photo {
  @PrimaryGeneratedColumn('uuid')
  photo_id: string;

  @Index() // 外部キーにはインデックスを作成
  @Column({ type: 'uniqueidentifier', nullable: false }) // UUID -> uniqueidentifier
  user_id: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: false }) // TEXT -> NVARCHAR(MAX)
  file_path: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: false }) // TEXT -> NVARCHAR(MAX)
  original_filename: string;

  @CreateDateColumn({ type: 'datetimeoffset' })
  uploaded_at: Date;

  @Column({ type: 'bigint', nullable: true }) // BIGINT
  file_size: number | null; // nullableを考慮

  @Column({ type: 'nvarchar', length: 50, nullable: true }) // VARCHAR -> NVARCHAR
  mime_type: string | null; // nullableを考慮

  // --- リレーション定義 ---
  @ManyToOne(() => User, (user) => user.photos, { onDelete: 'CASCADE' }) // Userとの多対一リレーション
  @JoinColumn({ name: 'user_id' })
  user: User;
}