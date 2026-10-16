import React, { useState } from 'react';
import { useProfileSetup } from '../hooks/useProfileSetup';
import { Button, TextField, SelectField, ErrorBanner } from '../components/ui';

export const ProfileSetup: React.FC = () => {
  const {
    step,
    basics,
    contact,
    errorMessage,
    setErrorMessage,
    catalogueSkills,
    mySkills,
    handleBasicsSubmit,
    handleContactSubmit,
    addSkill,
    removeSkill,
    handleFinish,
    isSaving,
  } = useProfileSetup();

  // Form states
  const [fname, setFname] = useState(basics.fname);
  const [lname, setLname] = useState(basics.lname);
  const [dept, setDept] = useState(basics.dept);
  const [year, setYear] = useState(basics.year);

  const [phone1, setPhone1] = useState(contact.phone1);
  const [phone2, setPhone2] = useState(contact.phone2);
  const [email1, setEmail1] = useState(contact.email1);
  const [email2, setEmail2] = useState(contact.email2);

  const [skillSearch, setSkillSearch] = useState('');

  const onStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fname.trim() || fname.length > 20) {
      setErrorMessage('First name is required (max 20 characters)');
      return;
    }
    if (!lname.trim() || lname.length > 20) {
      setErrorMessage('Last name is required (max 20 characters)');
      return;
    }
    if (!dept.trim() || dept.length > 30) {
      setErrorMessage('Department is required (max 30 characters)');
      return;
    }
    handleBasicsSubmit({
      fname: fname.trim(),
      lname: lname.trim(),
      dept: dept.trim(),
      year: Number(year),
    });
  };

  const onStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone1.trim()) {
      setErrorMessage('Phone 1 is required');
      return;
    }
    if (!email1.trim()) {
      setErrorMessage('Email 1 is required');
      return;
    }
    handleContactSubmit({
      phone1: phone1.trim(),
      phone2: phone2.trim(),
      email1: email1.trim(),
      email2: email2.trim(),
    });
  };

  const filteredCatalogueSkills = catalogueSkills.filter((s) =>
    s.skillname.toLowerCase().includes(skillSearch.toLowerCase()) ||
    s.categoryname.toLowerCase().includes(skillSearch.toLowerCase())
  );

  return (
    <div className="w-full min-h-[calc(100vh-64px)] bg-surface py-space-xl px-margin flex flex-col items-center">
      <div className="w-full max-w-[640px] flex flex-col gap-space-lg">
        {/* Title & Micro Metadata */}
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs text-primary-container font-label-xs uppercase tracking-wider font-semibold">
            <span className="inline-block w-2 h-2 rounded-full bg-primary-container"></span>
            <span data-testid="profilesetup-step">Step {step} of 3</span>
            <span>•</span>
            <span>{step === 1 ? 'Academic Basics' : step === 2 ? 'Contact Details' : 'Skill Selection'}</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface font-bold tracking-tight">
            Set up your profile
          </h1>
        </div>

        {/* Segmented Step Progress Indicator */}
        <nav aria-label="Registration Progress" className="w-full grid grid-cols-3 gap-space-sm pt-space-xs">
          <div className="flex flex-col gap-space-xs">
            <div className={`h-1 w-full rounded-full transition-all ${step >= 1 ? 'bg-primary-container' : 'bg-surface-container-high'}`} />
            <div className={`flex items-center gap-space-2xs font-label-sm text-label-sm ${step === 1 ? 'font-semibold text-primary-container' : 'font-medium text-secondary'}`}>
              <span>1</span>
              <span>Basics</span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <div className={`h-1 w-full rounded-full transition-all ${step >= 2 ? 'bg-primary-container' : 'bg-surface-container-high'}`} />
            <div className={`flex items-center gap-space-2xs font-label-sm text-label-sm ${step === 2 ? 'font-semibold text-primary-container' : 'font-medium text-secondary'}`}>
              <span>2</span>
              <span>Contact</span>
            </div>
          </div>
          <div className="flex flex-col gap-space-xs">
            <div className={`h-1 w-full rounded-full transition-all ${step >= 3 ? 'bg-primary-container' : 'bg-surface-container-high'}`} />
            <div className={`flex items-center gap-space-2xs font-label-sm text-label-sm ${step === 3 ? 'font-semibold text-primary-container' : 'font-medium text-secondary'}`}>
              <span>3</span>
              <span>Skills</span>
            </div>
          </div>
        </nav>

        {errorMessage && (
          <ErrorBanner
            message={errorMessage}
            data-testid="profilesetup-error"
            onDismiss={() => setErrorMessage(null)}
          />
        )}

        {/* Step 1: Basics Form */}
        {step === 1 && (
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-lg">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[20px]">badge</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Step 1: Academic &amp; Personal Basics
                  </h2>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Personal identification for university skill exchange
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={onStep1Submit} className="flex flex-col gap-space-md">
              <TextField
                id="fname"
                label="First Name"
                required
                maxLength={20}
                data-testid="profilesetup-fname"
                value={fname}
                onChange={(e) => setFname(e.target.value)}
                placeholder="e.g. Rahul"
              />

              <TextField
                id="lname"
                label="Last Name"
                required
                maxLength={20}
                data-testid="profilesetup-lname"
                value={lname}
                onChange={(e) => setLname(e.target.value)}
                placeholder="e.g. Sharma"
              />

              <TextField
                id="dept"
                label="Department"
                required
                maxLength={30}
                data-testid="profilesetup-dept"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
                placeholder="e.g. Computer Science"
              />

              <SelectField
                id="year"
                label="Year of Study (1-4)"
                required
                data-testid="profilesetup-year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                <option value={1}>1st Year</option>
                <option value={2}>2nd Year</option>
                <option value={3}>3rd Year</option>
                <option value={4}>4th Year</option>
              </SelectField>

              <div className="flex justify-end pt-space-xs">
                <Button type="submit" data-testid="profilesetup-submit" className="w-full sm:w-auto">
                  Continue to Contact Details
                </Button>
              </div>
            </form>
          </section>
        )}

        {/* Step 2: Contact Form */}
        {step === 2 && (
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-lg">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[20px]">call</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Step 2: Contact Information
                  </h2>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Shared with matched peers only after a session request is confirmed
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={onStep2Submit} className="flex flex-col gap-space-md">
              <TextField
                id="phone1"
                label="Phone 1"
                type="tel"
                required
                maxLength={15}
                helperText="10 digits, optional +91 prefix."
                data-testid="profilesetup-phone1"
                value={phone1}
                onChange={(e) => setPhone1(e.target.value)}
                placeholder="e.g. 9876543210"
              />

              <TextField
                id="phone2"
                label="Phone 2 (optional)"
                type="tel"
                maxLength={15}
                helperText="Alternate contact phone number."
                data-testid="profilesetup-phone2"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="e.g. 9876543211"
              />

              <TextField
                id="email1"
                label="Contact Email 1"
                type="email"
                required
                maxLength={50}
                data-testid="profilesetup-email1"
                value={email1}
                onChange={(e) => setEmail1(e.target.value)}
                placeholder="primary@vitstudent.ac.in"
              />

              <TextField
                id="email2"
                label="Contact Email 2 (optional)"
                type="email"
                maxLength={50}
                data-testid="profilesetup-email2"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
                placeholder="alternate@vitstudent.ac.in"
              />

              <div className="flex justify-end pt-space-xs">
                <Button
                  type="submit"
                  data-testid="profilesetup-submit"
                  disabled={isSaving}
                  isLoading={isSaving}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? 'Saving...' : 'Save and Continue to Skills'}
                </Button>
              </div>
            </form>
          </section>
        )}

        {/* Step 3: Skills Selection */}
        {step === 3 && (
          <section className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 p-space-lg shadow-sm flex flex-col gap-space-lg">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high">
              <div className="flex items-center gap-space-sm">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[20px]">school</span>
                </div>
                <div>
                  <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                    Step 3: Select Skills You Can Teach
                  </h2>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Please select at least 1 skill from the catalogue
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Skills Chips */}
            <div className="flex flex-col gap-space-xs">
              <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                My Skills ({mySkills.length})
              </h3>
              {mySkills.length === 0 ? (
                <p data-testid="profilesetup-no-skills" className="font-body-sm text-body-sm text-secondary bg-surface-container-low p-space-sm rounded-lg">
                  No skills selected yet. Choose from the catalogue below.
                </p>
              ) : (
                <div className="flex flex-wrap gap-space-xs p-space-sm bg-surface-container-low rounded-lg">
                  {mySkills.map((s) => (
                    <span
                      key={s.skillid}
                      data-testid={`profilesetup-myskill-row-${s.skillid}`}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container-lowest border border-outline-variant rounded-full text-label-sm font-medium text-on-surface shadow-xs"
                    >
                      <span>{s.skillname}</span>
                      <span className="text-secondary text-label-xs">({s.categoryname})</span>
                      <button
                        type="button"
                        data-testid={`profilesetup-skill-remove-${s.skillid}`}
                        onClick={() => removeSkill(s.skillid)}
                        className="text-secondary hover:text-error rounded-full p-0.5 hover:bg-surface-container transition-colors cursor-pointer"
                        aria-label={`Remove ${s.skillname}`}
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Catalogue Skills Search & Table */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-label-md text-label-md font-semibold text-on-surface">
                  Catalogue Skills
                </h3>
              </div>

              <TextField
                placeholder="Search skills or categories..."
                leftIcon="search"
                value={skillSearch}
                onChange={(e) => setSkillSearch(e.target.value)}
              />

              <div className="border border-outline-variant/60 rounded-lg overflow-hidden max-h-[320px] overflow-y-auto">
                {filteredCatalogueSkills.length === 0 ? (
                  <p className="p-space-lg text-center font-body-sm text-body-sm text-secondary">
                    No matching skills found in catalogue.
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-surface-container-low text-secondary font-label-xs uppercase tracking-wider sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-space-sm font-semibold">Skill</th>
                        <th className="py-2.5 px-space-sm font-semibold">Category</th>
                        <th className="py-2.5 px-space-sm font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container-high font-body-md text-body-md">
                      {filteredCatalogueSkills.map((s) => {
                        const alreadyAdded = mySkills.some((ms) => ms.skillid === s.skillid);
                        return (
                          <tr
                            key={s.skillid}
                            data-testid={`profilesetup-skill-row-${s.skillid}`}
                            className="hover:bg-surface-container-low/50 transition-colors"
                          >
                            <td className="py-2.5 px-space-sm font-medium text-on-surface">{s.skillname}</td>
                            <td className="py-2.5 px-space-sm text-secondary">{s.categoryname}</td>
                            <td className="py-2.5 px-space-sm text-right">
                              {alreadyAdded ? (
                                <span className="inline-flex items-center gap-1 text-label-sm text-primary-container font-medium">
                                  <span className="material-symbols-outlined text-[16px]">check</span>
                                  Added
                                </span>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  data-testid={`profilesetup-skill-add-${s.skillid}`}
                                  onClick={() => addSkill(s.skillid)}
                                >
                                  Add
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-space-xs border-t border-surface-container-high">
              <Button
                type="button"
                data-testid="profilesetup-finish"
                onClick={handleFinish}
                disabled={mySkills.length === 0}
                className="w-full sm:w-auto"
              >
                Complete Setup
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
