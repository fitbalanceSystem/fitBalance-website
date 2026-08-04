@customer @profile @sanity @regression
Feature: Customer - Profile
  As a customer
  I want to view my profile
  So that I can see my personal details

  Background:
    Given I am logged in as customer
    And I am on the customer profile page

  @sanity
  Scenario: Profile page loads with name
    Then the profile name is displayed

  @regression
  Scenario: Profile form fields are populated
    Then the profile form fields are not empty
