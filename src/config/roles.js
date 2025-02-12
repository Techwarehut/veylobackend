const allRoles = {
  member: ['getUsers', 'addPurchaseOrders', 'getPurchaseOrders', 'getVendors'],
  lead: [
    'getUsers',
    'getCustomers',
    'manageCustomers',
    'manageVendors',
    'getVendors',
    'deletePurchaseOrders',
    'addPurchaseOrders',
    'getPurchaseOrders',
    'updatePurchaseOrders',
  ],
  owner: [
    'getUsers',
    'manageUsers',
    'getCustomers',
    'manageCustomers',
    'manageVendors',
    'getVendors',
    'approvePurchaseOrders',
    'deletePurchaseOrders',
    'addPurchaseOrders',
    'getPurchaseOrders',
    'updatePurchaseOrders',
    'getTenant',
    'manageTenant',
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
    'addPurchaseOrders',
    'getPurchaseOrders',
    'updatePurchaseOrders',
    'getTenant',
    'manageTenant',
  ],
};

const roles = Object.keys(allRoles);
const roleRights = new Map(Object.entries(allRoles));

module.exports = {
  roles,
  roleRights,
};
