/*
  # Fix Inventory RLS to Allow Users to View Their Purchased Codes

  ## Problem
  The inventory table had RLS policies that only allowed admins to view inventory.
  This prevented regular users from seeing the codes they purchased, even though
  the order had a valid inventory_id linking to the code.

  ## Solution
  Add a new RLS policy that allows users to view inventory items that are linked
  to their own orders. This ensures:
  - Users can ONLY see codes they have purchased
  - Admins can still see all inventory
  - Unpurchased/available codes remain hidden from regular users

  ## Security
  - Users can only SELECT inventory records linked to their orders via inventory_id
  - Users cannot see available inventory that hasn't been assigned to their orders
  - The policy checks ownership through the orders table
*/

-- Allow users to view inventory for their own orders
CREATE POLICY "Users can view inventory for their own orders"
  ON inventory
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM orders
      WHERE orders.inventory_id = inventory.id
        AND orders.user_id = auth.uid()
    )
  );
