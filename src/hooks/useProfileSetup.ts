import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { useAuth } from '../lib/auth/useAuth';
import { AppError, errorMessages } from '../lib/types';

export type ProfileSetupStep = 1 | 2 | 3;

export function useProfileSetup() {
  const { me } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState<ProfileSetupStep>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initial values from me?.student
  const student = me?.student;
  const [basics, setBasics] = useState({
    fname: student?.fname ?? '',
    lname: student?.lname ?? '',
    dept: student?.dept ?? '',
    year: student?.year ?? 1,
  });

  const [contact, setContact] = useState({
    phone1: student?.phone1 ?? '',
    phone2: student?.phone2 ?? '',
    email1: student?.email1 ?? student?.regno ? '' : '',
    email2: student?.email2 ?? '',
  });

  // Keep contact.email1 defaulted to existing email1 or login email
  if (!contact.email1 && student?.email1) {
    setContact((prev) => ({ ...prev, email1: student.email1 ?? '' }));
  }

  // Catalogue skills for step 3
  const { data: catalogueSkills = [] } = useQuery({
    queryKey: queryKeys.catalogue.skills(),
    queryFn: () => api.listSkills(),
    enabled: step === 3,
  });

  // Student's currently added skills
  const { data: mySkills = [] } = useQuery({
    queryKey: queryKeys.catalogue.mySkills,
    queryFn: () => api.listMySkills(),
    enabled: step === 3,
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (payload: {
      fname: string;
      lname: string;
      dept: string;
      year: number;
      phone1: string;
      phone2: string | null;
      email1: string;
      email2: string | null;
    }) => {
      return await api.updateMyProfile(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      setErrorMessage(null);
    },
    onError: (err: unknown) => {
      if (err instanceof AppError) {
        setErrorMessage(errorMessages[err.code] || err.message);
      } else {
        setErrorMessage('Failed to save profile');
      }
    },
  });

  const addSkillMutation = useMutation({
    mutationFn: (skillid: number) => api.addMySkill(skillid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogue.mySkills });
    },
  });

  const removeSkillMutation = useMutation({
    mutationFn: (skillid: number) => api.removeMySkill(skillid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.catalogue.mySkills });
    },
  });

  const handleBasicsSubmit = (data: { fname: string; lname: string; dept: string; year: number }) => {
    setBasics(data);
    setErrorMessage(null);
    setStep(2);
  };

  const handleContactSubmit = async (data: {
    phone1: string;
    phone2: string;
    email1: string;
    email2: string;
  }) => {
    setContact(data);
    try {
      await saveProfileMutation.mutateAsync({
        fname: basics.fname,
        lname: basics.lname,
        dept: basics.dept,
        year: Number(basics.year),
        phone1: data.phone1,
        phone2: data.phone2.trim() ? data.phone2 : null,
        email1: data.email1,
        email2: data.email2.trim() ? data.email2 : null,
      });
      setStep(3);
    } catch {
      // Error is set in mutation onError
    }
  };

  const handleFinish = () => {
    if (mySkills.length === 0) {
      setErrorMessage('Please select at least 1 skill you can teach');
      return;
    }
    navigate('/dashboard');
  };

  return {
    step,
    setStep,
    basics,
    contact,
    errorMessage,
    setErrorMessage,
    catalogueSkills,
    mySkills,
    handleBasicsSubmit,
    handleContactSubmit,
    addSkill: (skillid: number) => addSkillMutation.mutate(skillid),
    removeSkill: (skillid: number) => removeSkillMutation.mutate(skillid),
    handleFinish,
    isSaving: saveProfileMutation.isPending,
  };
}
