import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Session } from './Session';

@Entity('feedbacks')
export class Feedback {
  @PrimaryColumn({ type: 'uuid', name: 'session_id' })
  sessionId!: string;

  @OneToOne(() => Session, (s) => s.feedback, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: Session;

  @Column({ type: 'varchar', length: 20 })
  emotion!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
