Feature: Shop
  As a customer
  I want to browse products and add them to my cart
  So that I can make a purchase

  Background:
    Given I am on the shop page

  Scenario: Products are displayed in the grid
    Then products are visible in the grid

  Scenario: Search for a product
    When I search for "גרביים"
    Then only products containing "גרביים" are shown

  Scenario: Add a product to the cart
    When I click the first product
    And I click the add to cart button
    Then the cart item count increases

  Scenario: Open the cart drawer
    Given I have added a product to the cart
    When I open the cart
    Then the cart drawer is visible with items

  Scenario: Sort products by price ascending
    When I sort by "price-asc"
    Then products are ordered from lowest to highest price
