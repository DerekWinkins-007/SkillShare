import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/useAuth';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { isValidPhone } from '../lib/rules';
import { AppError, errorMessages } from '../lib/types';
import { Button, TextField, SelectField, ErrorBanner } from '../components/ui';

export const ProfileEdit: React.FC = () => {
  const { me } = useAuth();
  const student = me?.student;
  const queryClient = useQueryClient();

  const [fname, setFname] = useState(student?.fname ?? '');
  const [lname, setLname] = useState(student?.lname ?? '');
  const [dept, setDept] = useState(student?.dept ?? '');
  const [year, setYear] = useState(student?.year ?? 1);
  const [phone1, setPhone1] = useState(student?.phone1 ?? '');
  const [phone2, setPhone2] = useState(student?.phone2 ?? '');
  const [email1, setEmail1] = useState(student?.email1 ?? '');
  const [email2, setEmail2] = useState(student?.email2 ?? '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!fname.trim() || fname.length > 20) throw new AppError('VALIDATION', 'First name 1-20 chars');
      if (!lname.trim() || lname.length > 20) throw new AppError('VALIDATION', 'Last name 1-20 chars');
      if (!dept.trim() || dept.length > 30) throw new AppError('VALIDATION', 'Department 1-30 chars');
      if (!isValidPhone(phone1.trim())) throw new AppError('VALIDATION', 'Phone 1 is invalid');
      if (phone2.trim() && !isValidPhone(phone2.trim())) throw new AppError('VALIDATION', 'Phone 2 is invalid');
      if (!email1.trim() || email1.length > 50) throw new AppError('VALIDATION', 'Email 1 is invalid');
      if (email2.trim() && email2.length > 50) throw new AppError('VALIDATION', 'Email 2 is invalid');

      return await api.updateMyProfile({
        fname: fname.trim(),
        lname: lname.trim(),
        dept: dept.trim(),
        year: Number(year),
        phone1: phone1.trim(),
        phone2: phone2.trim() ? phone2.trim() : null,
        email1: email1.trim().toLowerCase(),
        email2: email2.trim() ? email2.trim().toLowerCase() : null,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      setSuccessMsg('Profile updated successfully');
      setFname(updated.fname ?? '');
      setLname(updated.lname ?? '');
      setDept(updated.dept ?? '');
      setYear(updated.year ?? 1);
      setPhone1(updated.phone1 ?? '');
      setPhone2(updated.phone2 ?? '');
      setEmail1(updated.email1 ?? '');
      setEmail2(updated.email2 ?? '');
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setErrorMsg(errorMessages[err.code] || err.message);
      } else {
        setErrorMsg('Failed to update profile');
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    editMutation.mutate();
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto px-margin md:px-margin-wide py-space-xl">
      {/* Top Title Area */}
      <div className="flex flex-col gap-space-2xs mb-space-xl">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h1 className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            Edit profile
          </h1>
          <span className="font-code-sm text-code-sm text-secondary uppercase tracking-wider bg-surface-container-low px-space-xs py-1 rounded">
            Registration Number: <strong className="text-on-surface">{student?.regno}</strong>
          </span>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter-wide items-start">
        {/* Left Column: Form Card */}
        <section className="lg:col-span-8 max-w-[640px] w-full bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-sm p-space-lg">
          <div className="flex items-center justify-between pb-space-sm mb-space-lg border-b border-surface-container-high">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-primary-container text-[20px]">badge</span>
              <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">Details</h2>
            </div>
            <span className="font-label-xs text-label-xs text-secondary bg-surface-container-low px-space-xs py-1 rounded">
              Required fields marked with *
            </span>
          </div>

          {errorMsg && (
            <div className="mb-space-md">
              <ErrorBanner
                message={errorMsg}
                data-testid="profileedit-error"
                onDismiss={() => setErrorMsg(null)}
              />
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              data-testid="profileedit-success"
              className="mb-space-md bg-status-success-bg border border-status-success-border text-status-success-text rounded-lg p-space-sm flex items-center gap-space-xs font-body-sm font-medium"
            >
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-space-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <TextField
                id="fname"
                label="First Name"
                required
                maxLength={20}
                data-testid="profileedit-fname"
                value={fname}
                onChange={(e) => setFname(e.target.value)}
              />

              <TextField
                id="lname"
                label="Last Name"
                required
                maxLength={20}
                data-testid="profileedit-lname"
                value={lname}
                onChange={(e) => setLname(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <TextField
                id="dept"
                label="Department"
                required
                maxLength={30}
                data-testid="profileedit-dept"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
              />

              <SelectField
                id="year"
                label="Year of Study (1-4)"
                required
                data-testid="profileedit-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </SelectField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <TextField
                id="phone1"
                label="Phone 1"
                type="tel"
                required
                maxLength={15}
                helperText="10 digits, optional +91 prefix."
                data-testid="profileedit-phone1"
                value={phone1}
                onChange={(e) => setPhone1(e.target.value)}
              />

              <TextField
                id="phone2"
                label="Phone 2 (optional)"
                type="tel"
                maxLength={15}
                data-testid="profileedit-phone2"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <TextField
                id="email1"
                label="Contact Email 1"
                type="email"
                required
                maxLength={50}
                data-testid="profileedit-email1"
                value={email1}
                onChange={(e) => setEmail1(e.target.value)}
              />

              <TextField
                id="email2"
                label="Contact Email 2 (optional)"
                type="email"
                maxLength={50}
                data-testid="profileedit-email2"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-space-xs">
              <Button
                type="submit"
                data-testid="profileedit-submit"
                disabled={editMutation.isPending}
                isLoading={editMutation.isPending}
                className="w-full sm:w-auto"
              >
                {editMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </section>

        {/* Right Column: Guidance Info */}
        <aside className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-space-md shadow-sm flex flex-col gap-space-xs">
            <div className="flex items-center gap-2 text-primary-container font-headline-sm text-headline-sm font-semibold">
              <span className="material-symbols-outlined text-[20px]">info</span>
              <span>Privacy Note</span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">
              Your contact details (phone numbers and secondary email) will only be revealed to verified peers after a session slot has been agreed and confirmed by both parties.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};
