import { describe, expect, it } from 'vitest';
import {
  canReadAnyApplication,
  canReadApplication,
  canReadAssignedApplication,
  canReadOwnApplication,
  readsAllApplications,
  type ApplicationReadResource,
} from '@/domains/applications/policies';
import type { Permission } from '@/lib/permissions/catalog';
import type { Subject } from '@/lib/permissions/check';

function subjectWith(userId: string, ...keys: Permission[]): Subject {
  return { userId, permissions: new Set<string>(keys) };
}

const OWNED: ApplicationReadResource = {
  applicantUserId: 'applicant-1',
  assigneeUserIds: [],
};
const ASSIGNED: ApplicationReadResource = {
  applicantUserId: 'applicant-9',
  assigneeUserIds: new Set(['worker-1']),
};

describe('application read policies', () => {
  it('read-any admits any application in the tenant', () => {
    const anyReader = subjectWith('worker-1', 'application:read-any');
    expect(canReadAnyApplication(anyReader, OWNED)).toBe(true);
    expect(canReadApplication(anyReader, ASSIGNED)).toBe(true);
    expect(readsAllApplications(anyReader)).toBe(true);
  });

  it('read-own admits only the applicant themselves', () => {
    const applicant = subjectWith('applicant-1', 'application:read-own');
    expect(canReadOwnApplication(applicant, OWNED)).toBe(true);
    // Same capability, different application they are not the applicant on.
    expect(canReadOwnApplication(applicant, ASSIGNED)).toBe(false);
    expect(readsAllApplications(applicant)).toBe(false);
  });

  it('read-assigned admits only an active assignee', () => {
    const worker = subjectWith('worker-1', 'application:read-assigned');
    expect(canReadAssignedApplication(worker, ASSIGNED)).toBe(true);
    const other = subjectWith('worker-2', 'application:read-assigned');
    expect(canReadAssignedApplication(other, ASSIGNED)).toBe(false);
  });

  it('fails closed without any capability', () => {
    const nobody = subjectWith('applicant-1');
    expect(canReadApplication(nobody, OWNED)).toBe(false);
  });

  it('capability without the contextual match still denies', () => {
    // Holds read-assigned but is not assigned; holds nothing making them owner.
    const worker = subjectWith('worker-2', 'application:read-assigned');
    expect(canReadApplication(worker, ASSIGNED)).toBe(false);
  });

  it('composed policy accepts any single sufficient ground', () => {
    const applicant = subjectWith('applicant-1', 'application:read-own');
    expect(canReadApplication(applicant, OWNED)).toBe(true);
    const worker = subjectWith('worker-1', 'application:read-assigned');
    expect(canReadApplication(worker, ASSIGNED)).toBe(true);
  });
});
