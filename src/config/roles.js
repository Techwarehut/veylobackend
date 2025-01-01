const allRoles = {
  member: ['getUsers'],
  lead: ['getUsers', 'manageUsers'],
  owner: ['getUsers', 'manageUsers'],
  admin: ['getUsers', 'manageUsers'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
