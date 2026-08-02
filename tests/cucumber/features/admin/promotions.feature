@admin @promotions @sanity @regression
Feature: Admin - Promotions Management
  As an admin
  I want to manage promotions and coupons
  So that I can run marketing campaigns

  Background:
    Given I am logged in as admin
    And I am on the admin promotions page

  @sanity
  Scenario: Promotions list is displayed
    Then the promotions count badge is visible

  @regression
  Scenario: Add a new promotion
    When I open the add promotion modal
    And I fill in promotion name "Test Promo" type "percent" value 10
    And I save the promotion
    Then the promotions count badge is visible

  @regression
  Scenario: Toggle first promotion status
    When I toggle the first promotion
    Then the promotions count badge is visible
