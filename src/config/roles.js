const allRoles = {
  member: ['getUsers'],
  lead: ['getUsers', 'getCustomers', 'manageCustomers', 'manageVendors', 'getVendors', 'deletePurchaseOrders'],
  owner: [
    'getUsers',
    'manageUsers',
    'getCustomers',
    'manageCustomers',
    'manageVendors',
    'getVendors',
    'approvePurchaseOrders',
    'deletePurchaseOrders',
  ],
  admin: [
    'getUsers',
    'manageUsers',
    'getCustomers',
    'manageCustomers',
    'manageVendors',
    'getVendors',
    'approvePurchaseOrders',
    'deletePurchaseOrders',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
