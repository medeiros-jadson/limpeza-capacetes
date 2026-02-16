import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Machine } from './Machine';
import { Payment } from './Payment';
import { Feedback } from './Feedback';

export enum SessionStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'machine_id' })
  machineId!: string;

  @ManyToOne(() => Machine, (m) => m.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'machine_id' })
  machine!: Machine;

  @Column({ type: 'varchar', length: 20, default: SessionStatus.CREATED })
  status!: SessionStatus;

  @Column({ type: 'int' })
  price!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'started_at' })
  startedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'finished_at' })
  finishedAt!: Date | null;

  @OneToMany(() => Payment, (p) => p.session)
  payments!: Payment[];

  @OneToOne(() => Feedback, (f) => f.session, { nullable: true })
  feedback!: Feedback | null;
}
