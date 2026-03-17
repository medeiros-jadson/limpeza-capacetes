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

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 5,
    transformer: { from: (v: string | number) => (v != null ? Number(v) : 0), to: (v: number) => v },
  })
  price!: number;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'api_token' })
  apiToken!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('cleaning_types')
export class CleaningType {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: { from: (v: string | number) => (v != null ? Number(v) : 0), to: (v: number) => v },
  })
  price!: number;

  @Column({ type: 'int', name: 'duration_seconds' })
  durationSeconds!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', name: 'machine_id' })
  machineId!: string;

  @Column({ type: 'uuid', name: 'cleaning_type_id', nullable: true })
  cleaningTypeId!: string | null;

  @Column({ type: 'varchar', length: 20, default: SessionStatus.CREATED })
  status!: SessionStatus;

  @Column({ type: 'int' })
  price!: number;

  @Column({ type: 'int', name: 'duration_seconds', nullable: true })
  durationSeconds!: number | null;

  @Column({ type: 'uuid', name: 'coupon_id', nullable: true })
  couponId!: string | null;

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

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64, unique: true })
  code!: string;

  @Column({ type: 'int', name: 'discount_percent' })
  discountPercent!: number;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

@Entity('mercadopago_config')
export class MercadoPagoConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'access_token' })
  accessToken!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'payer_email' })
  payerEmail!: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true, name: 'webhook_secret' })
  webhookSecret!: string | null;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'updated_at' })
  updatedAt!: Date | null;
}
