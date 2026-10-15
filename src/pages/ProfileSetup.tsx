import React, { useState } from 'react';
import { useProfileSetup } from '../hooks/useProfileSetup';

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

  return (
    <section>
      <h1>Student Profile Setup</h1>
      <p data-testid="profilesetup-step">Step {step} of 3</p>
      {errorMessage && <p role="alert" data-testid="profilesetup-error">{errorMessage}</p>}

      {step === 1 && (
        <form onSubmit={onStep1Submit}>
          <h2>Step 1: Academic &amp; Personal Basics</h2>
          <div>
            <label htmlFor="fname">First Name:</label>
            <input
              id="fname"
              type="text"
              data-testid="profilesetup-fname"
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
              data-testid="profilesetup-lname"
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
              data-testid="profilesetup-dept"
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
              data-testid="profilesetup-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
            </select>
          </div>
          <button type="submit" data-testid="profilesetup-submit">
            Continue to Contact Details
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={onStep2Submit}>
          <h2>Step 2: Contact Information</h2>
          <div>
            <label htmlFor="phone1">Phone 1 (required, e.g. 9876543210 or +919876543210):</label>
            <input
              id="phone1"
              type="tel"
              data-testid="profilesetup-phone1"
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
              data-testid="profilesetup-phone2"
              maxLength={15}
              value={phone2}
              onChange={(e) => setPhone2(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="email1">Contact Email 1 (required):</label>
            <input
              id="email1"
              type="email"
              data-testid="profilesetup-email1"
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
              data-testid="profilesetup-email2"
              maxLength={50}
              value={email2}
              onChange={(e) => setEmail2(e.target.value)}
            />
          </div>
          <button type="submit" data-testid="profilesetup-submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save and Continue to Skills'}
          </button>
        </form>
      )}

      {step === 3 && (
        <div>
          <h2>Step 3: Select Skills You Can Teach</h2>
          <p>Please select at least 1 skill from the catalogue.</p>

          <section>
            <h3>My Skills ({mySkills.length})</h3>
            <ul>
              {mySkills.length === 0 ? (
                <li data-testid="profilesetup-no-skills">No skills selected yet.</li>
              ) : (
                mySkills.map((s) => (
                  <li key={s.skillid} data-testid={`profilesetup-myskill-row-${s.skillid}`}>
                    <span>{s.skillname} ({s.categoryname})</span>
                    <button
                      type="button"
                      data-testid={`profilesetup-skill-remove-${s.skillid}`}
                      onClick={() => removeSkill(s.skillid)}
                    >
                      Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h3>Catalogue Skills</h3>
            {catalogueSkills.length === 0 ? (
              <p>No skills currently available in catalogue.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Skill</th>
                    <th>Category</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogueSkills.map((s) => {
                    const alreadyAdded = mySkills.some((ms) => ms.skillid === s.skillid);
                    return (
                      <tr key={s.skillid} data-testid={`profilesetup-skill-row-${s.skillid}`}>
                        <td>{s.skillname}</td>
                        <td>{s.categoryname}</td>
                        <td>
                          {alreadyAdded ? (
                            <span>Added</span>
                          ) : (
                            <button
                              type="button"
                              data-testid={`profilesetup-skill-add-${s.skillid}`}
                              onClick={() => addSkill(s.skillid)}
                            >
                              Add
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <button
            type="button"
            data-testid="profilesetup-finish"
            onClick={handleFinish}
          >
            Complete Setup
          </button>
        </div>
      )}
    </section>
  );
};
