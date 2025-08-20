import React from 'react';
import { User } from '../hooks/useUsers';

interface Props {
  users: User[];
  attendance: number[];
  vote: number[];
  setAttendance: (ids: number[]) => void;
  setVote: (ids: number[]) => void;
}

const UserRoleSelector: React.FC<Props> = ({ users, attendance, vote, setAttendance, setVote }) => {
  const toggle = (id: number, list: number[], setter: (v: number[]) => void) => {
    if (list.includes(id)) setter(list.filter((x) => x !== id));
    else setter([...list, id]);
  };

  return (
    <div className="space-y-1 border rounded p-2 max-h-48 overflow-y-auto">
      {users.map((u) => (
        <div key={u.id} className="flex items-center space-x-2 text-sm">
          <span className="flex-1">{u.username}</span>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={attendance.includes(u.id)}
              onChange={() => toggle(u.id, attendance, setAttendance)}
            />
            <span>Asistencia</span>
          </label>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={vote.includes(u.id)}
              onChange={() => toggle(u.id, vote, setVote)}
            />
            <span>Votos</span>
          </label>
        </div>
      ))}
    </div>
  );
};

export default UserRoleSelector;
