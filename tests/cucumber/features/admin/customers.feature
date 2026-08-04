@admin @customers @sanity @regression
Feature: Admin - Customer Management
  As an admin
  I want to manage customers
  So that I can keep member data up to date

  Background:
    Given I am logged in as admin
    And I am on the admin customers page

  @sanity
  Scenario: Customers table is displayed
    Then the customers table contains at least one row

  @regression
  Scenario: Search filters the customer list
    When I search for a customer by name "שרה"
    Then the displayed count is greater than zero

  @regression
  Scenario: View customer modal opens
    When I click view on the first customer row
    Then the customer view modal is open

  @regression
  Scenario: Close customer view modal
    When I click view on the first customer row
    And I close the customer view modal
    Then the customer view modal is closed
