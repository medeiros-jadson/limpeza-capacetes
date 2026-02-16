import {
  Entity,
  PrimaryGeneratedColumn,
  PrimaryColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';

export enum MachineStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  OFFLINE = 'OFFLINE',
}

export enum SessionStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR',
}

@Entity('machines')
export class Machine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 20, default: MachineStatus.IDLE })
  status!: MachineStatus;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'ip_or_identifier' })
  ipOrIdentifier!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_seen_at' })
  lastSeenAt!: Date | null;

  @Column({ type: 'int', default: 500, name: 'price_cents' })
  priceCents!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'api_token' })
  apiToken!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'machine_id' })
  machineId!: string;

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
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 50, default: 'mercadopago' })
  provider!: string;

  @Column({ type: 'int' })
  amount!: number;

  @Column({ type: 'varchar', length: 30 })
  status!: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'external_id' })
  externalId!: string | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('feedbacks')
export class Feedback {
  @PrimaryColumn({ type: 'uuid', name: 'session_id' })
  sessionId!: string;

  @Column({ type: 'varchar', length: 20 })
  emotion!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
