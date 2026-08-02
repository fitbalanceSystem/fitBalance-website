@admin @store-settings @sanity @regression
Feature: Admin - Store Settings
  As an admin
  I want to configure store settings
  So that the shop reflects the correct branding and policies

  Background:
    Given I am logged in as admin
    And I am on the store settings page

  @sanity
  Scenario: Store settings page loads with brand tab active
    Then the store name field is visible

  @regression
  Scenario: Switch to contact tab
    When I switch the store settings tab to "contact"
    Then the contact phone field is visible

  @regression
  Scenario: Switch to shipping tab
    When I switch the store settings tab to "shipping"
    Then the shipping price field is visible
