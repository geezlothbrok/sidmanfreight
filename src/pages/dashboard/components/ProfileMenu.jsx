import { useCallback, useEffect, useState } from 'react';
import { FiUser, FiSettings } from 'react-icons/fi';
import {
  ProfilePopover,
  Dialog, DialogPortal, DialogOverlay, DialogContent, DialogTitle, DialogDescription,
  Field, FieldLabel, FieldControl, FieldError, Input, Button,
} from '@rfdtech/components';

import { authFetch } from '../../../utils/authFetch';
import { displayNameFromEmail, initialsFromEmail } from '../../../utils/auth';

/**
 * The header profile menu, shared by all three dashboards so every role gets the
 * same "My Profile" and "Account Settings" rows.
 *
 * Both rows are backed by real endpoints:
 *   get_my_profile     — the caller's own record
 *   update_my_profile  — their own contact details
 *   change_my_password — requires the current password
 *
 * The fixed manager/finance accounts have no `employees` row (their credentials
 * live in auth_config.php on the server), so the API reports `can_edit: false`
 * and this component shows a read-only profile and explains why.
 */
export default function ProfileMenu({ apiUrl, email, role, onSignOut }) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [phone, setPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  const loadProfile = useCallback(async () => {
    setLoadError('');
    try {
      const res = await authFetch(`${apiUrl}?action=get_my_profile`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setProfile(data.profile);
        setPhone(data.profile.phone || '');
      } else {
        setLoadError(data.error || 'Could not load your profile.');
      }
    } catch {
      setLoadError('Could not reach the portal. Please try again.');
    }
  }, [apiUrl]);

  useEffect(() => {
    if (profileOpen || settingsOpen) loadProfile();
  }, [profileOpen, settingsOpen, loadProfile]);

  const savePhone = async (e) => {
    e.preventDefault();
    setSavingPhone(true); setPhoneMsg('');
    try {
      const fd = new FormData();
      fd.append('phone', phone);
      const res = await authFetch(`${apiUrl}?action=update_my_profile`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      setPhoneMsg(res.ok && data.success ? 'Contact details saved.' : (data.error || 'Could not save.'));
      if (res.ok && data.success) loadProfile();
    } catch {
      setPhoneMsg('Could not reach the portal.');
    }
    setSavingPhone(false);
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPasswordErr(''); setPasswordMsg('');
    if (newPassword !== confirmPassword) {
      setPasswordErr('The two new passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      const fd = new FormData();
      fd.append('current_password', currentPassword);
      fd.append('new_password', newPassword);
      const res = await authFetch(`${apiUrl}?action=change_my_password`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setPasswordMsg('Password changed. Use the new one next time you sign in.');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        setPasswordErr(data.error || 'Could not change your password.');
      }
    } catch {
      setPasswordErr('Could not reach the portal.');
    }
    setSavingPassword(false);
  };

  const rows = [
    { label: 'Name', value: profile?.name || displayNameFromEmail(email) },
    { label: 'Email', value: profile?.email || email },
    { label: 'Role', value: profile?.role || role },
    { label: 'Phone', value: profile?.phone || '—' },
    { label: 'Status', value: profile?.status || '—' },
  ];

  return (
    <>
      <ProfilePopover
        user={{
          name: displayNameFromEmail(email),
          role,
          email,
          initials: initialsFromEmail(email),
        }}
        variant="full"
        items={[
          { icon: <FiUser />, label: 'My Profile', onClick: () => setProfileOpen(true) },
          { icon: <FiSettings />, label: 'Account Settings', onClick: () => setSettingsOpen(true) },
        ]}
        onSignOut={onSignOut}
      />

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>My profile</DialogTitle>
            <DialogDescription>Your account details on the staff portal.</DialogDescription>

            {loadError ? <p className="mgr-inline-error">{loadError}</p> : null}

            <dl className="profile-rows">
              {rows.map((r) => (
                <div key={r.label}>
                  <dt>{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>

            {profile?.can_edit ? (
              <form onSubmit={savePhone} className="profile-form">
                <Field>
                  <FieldLabel htmlFor="profile-phone">Phone</FieldLabel>
                  <FieldControl>
                    <Input
                      id="profile-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="024 000 0000"
                    />
                  </FieldControl>
                </Field>
                <Button type="submit" variant="primary" disabled={savingPhone}>
                  {savingPhone ? 'Saving…' : 'Save contact details'}
                </Button>
                {phoneMsg ? <p className="profile-msg">{phoneMsg}</p> : null}
              </form>
            ) : (
              <p className="profile-note">
                This is a shared role account configured on the server, so its
                details cannot be edited here.
              </p>
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogPortal>
          <DialogOverlay />
          <DialogContent>
            <DialogTitle>Account settings</DialogTitle>
            <DialogDescription>Change the password you use to sign in.</DialogDescription>

            {profile && !profile.can_edit ? (
              <p className="profile-note">
                The {role.toLowerCase()} password is set on the server in
                auth_config.php and cannot be changed from the portal.
              </p>
            ) : (
              <form onSubmit={savePassword} className="profile-form">
                <Field>
                  <FieldLabel htmlFor="cur-pw">Current password</FieldLabel>
                  <FieldControl>
                    <Input id="cur-pw" type="password" value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" />
                  </FieldControl>
                </Field>
                <Field>
                  <FieldLabel htmlFor="new-pw">New password</FieldLabel>
                  <FieldControl>
                    <Input id="new-pw" type="password" value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
                  </FieldControl>
                  <FieldError>At least 6 characters.</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirm-pw">Confirm new password</FieldLabel>
                  <FieldControl>
                    <Input id="confirm-pw" type="password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} autoComplete="new-password" />
                  </FieldControl>
                </Field>
                <Button type="submit" variant="primary" disabled={savingPassword}>
                  {savingPassword ? 'Saving…' : 'Change password'}
                </Button>
                {passwordErr ? <p className="mgr-inline-error">{passwordErr}</p> : null}
                {passwordMsg ? <p className="profile-msg">{passwordMsg}</p> : null}
              </form>
            )}
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
}
