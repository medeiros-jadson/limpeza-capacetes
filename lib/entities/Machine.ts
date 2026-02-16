import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Session } from './Session';

export enum MachineStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  OFFLINE = 'OFFLINE',
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

  @OneToMany(() => Session, (s) => s.machine)
  sessions!: Session[];
}
