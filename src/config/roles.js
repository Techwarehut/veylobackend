const allRoles = {
  member: ['getUsers'],
  lead: ['getUsers', 'getCustomers', 'manageCustomers'],
  owner: ['getUsers', 'manageUsers', 'getCustomers', 'manageCustomers'],
  admin: ['getUsers', 'manageUsers', 'getCustomers', 'manageCustomers'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
