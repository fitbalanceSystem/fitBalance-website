@customer @plans @sanity @regression
Feature: Customer - Plans
  As a customer
  I want to view my enrollment plans
  So that I can track my memberships

  Background:
    Given I am logged in as customer
    And I am on the customer plans page

  @sanity
  Scenario: Enrollments grid is displayed
    Then the enrollments grid is visible

  @regression
  Scenario: At least one enrollment is shown
    Then the enrollment count is greater than zero
