import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('stickers')
export class Sticker {
  @PrimaryGeneratedColumn('uuid')
  sticker_id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string;

  @Column({ type: 'text', nullable: false })
  file_path: string;

  @Column({ type: 'text', nullable: true })
  thumbnail_path: string;

  @Column({ type: 'text', array: true, nullable: true })
  tags: string[];

  @CreateDateColumn({ type: 'datetimeoffset', default: () => 'GETDATE()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'datetimeoffset', default: () => 'GETDATE()', onUpdate: 'GETDATE()' })
  updated_at: Date;
}