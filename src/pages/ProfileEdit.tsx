import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth/useAuth';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { isValidPhone } from '../lib/rules';
import { AppError, errorMessages } from '../lib/types';

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
    <section>
      <h1>Edit Profile</h1>
      <p>Registration Number: <strong>{student?.regno}</strong></p>
      {errorMsg && <p role="alert" data-testid="profileedit-error">{errorMsg}</p>}
      {successMsg && <p role="status" data-testid="profileedit-success">{successMsg}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="fname">First Name:</label>
          <input
            id="fname"
            type="text"
            data-testid="profileedit-fname"
            required
            maxLength={20}
            value={fname}
            onChange={(e) => setFname(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="lname">Last Name:</label>
          <input
            id="lname"
            type="text"
            data-testid="profileedit-lname"
            required
            maxLength={20}
            value={lname}
            onChange={(e) => setLname(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="dept">Department:</label>
          <input
            id="dept"
            type="text"
            data-testid="profileedit-dept"
            required
            maxLength={30}
            value={dept}
            onChange={(e) => setDept(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="year">Year of Study (1-4):</label>
          <select
            id="year"
            data-testid="profileedit-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </div>
        <div>
          <label htmlFor="phone1">Phone 1:</label>
          <input
            id="phone1"
            type="tel"
            data-testid="profileedit-phone1"
            required
            maxLength={15}
            value={phone1}
            onChange={(e) => setPhone1(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="phone2">Phone 2 (optional):</label>
          <input
            id="phone2"
            type="tel"
            data-testid="profileedit-phone2"
            maxLength={15}
            value={phone2}
            onChange={(e) => setPhone2(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email1">Contact Email 1:</label>
          <input
            id="email1"
            type="email"
            data-testid="profileedit-email1"
            required
            maxLength={50}
            value={email1}
            onChange={(e) => setEmail1(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="email2">Contact Email 2 (optional):</label>
          <input
            id="email2"
            type="email"
            data-testid="profileedit-email2"
            maxLength={50}
            value={email2}
            onChange={(e) => setEmail2(e.target.value)}
          />
        </div>
        <button type="submit" data-testid="profileedit-submit" disabled={editMutation.isPending}>
          {editMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </section>
  );
};
