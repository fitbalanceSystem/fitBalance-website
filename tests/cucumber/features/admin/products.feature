Feature: Admin - Product Management
  As an admin
  I want to manage the product catalog
  So that the store stays up to date

  Background:
    Given I am logged in as admin
    And I am on the admin products page

  Scenario: Products table is displayed
    Then the products table contains at least one product

  Scenario: Add a new product
    When I click the add product button
    And I fill in name "Auto Test Product" and price 99.90
    And I save the product
    Then "Auto Test Product" appears in the product list

  Scenario: Search product by name
    When I search for "גרביים"
    Then only products containing "גרביים" are shown

  Scenario: Filter by active status
    When I filter by status "active"
    Then all displayed products are active

  Scenario: Edit an existing product
    Given a product named "Auto Test Product" exists
    When I click edit on that product
    And I change the price to 149.90
    And I save the product
    Then the updated price is shown in the list
