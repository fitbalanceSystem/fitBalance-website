@admin @programs @sanity @regression
Feature: Admin - Programs Management
  As an admin
  I want to manage class programs
  So that the schedule stays accurate

  Background:
    Given I am logged in as admin
    And I am on the admin programs page

  @sanity
  Scenario: Programs table is displayed
    Then the programs table contains at least one row

  @regression
  Scenario: Search programs
    When I search programs for "פילאטיס"
    Then the programs table contains at least one row

  @regression
  Scenario: Open add program modal
    When I click the new program button
    Then the program modal is open
