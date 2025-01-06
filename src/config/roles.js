const allRoles = {
  member: ['getUsers'],
  lead: ['getUsers', 'getCustomers', 'manageCustomers', 'manageVendors', 'getVendors'],
  owner: ['getUsers', 'manageUsers', 'getCustomers', 'manageCustomers', 'manageVendors', 'getVendors'],
  admin: ['getUsers', 'manageUsers', 'getCustomers', 'manageCustomers', 'manageVendors', 'getVendors'],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
